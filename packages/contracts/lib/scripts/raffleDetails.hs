{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DeriveAnyClass      #-}
{-# LANGUAGE DeriveGeneric       #-}
{-# LANGUAGE FlexibleContexts    #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE TypeApplications    #-}
{-# LANGUAGE TypeFamilies        #-}
{-# LANGUAGE TypeOperators       #-}

module RaffleDetails where

import           Control.Monad       hiding (fmap)
import           Data.Aeson          (ToJSON, FromJSON)
import           Data.Map            as Map
import           Data.Text           (Text)
import           Data.Void           (Void)
import           GHC.Generics        (Generic)
import           Plutus.Contract
import           PlutusTx            (Data (..))
import qualified PlutusTx
import           PlutusTx.Prelude    hiding (Semigroup(..), unless)
import           Ledger              hiding (singleton)
import           Ledger.Constraints  as Constraints
import qualified Ledger.Scripts      as Scripts
import           Ledger.Ada          as Ada
import           Ledger.Value
import           Playground.Contract (printJson, printSchemas, ensureKnownCurrencies, stage, PrintSchemas (..))
import           Playground.TH       (mkKnownCurrencies, mkSchemaDefinitions)
import           Playground.Types    (KnownCurrency (..))
import           Prelude             (IO, Semigroup (..), Show (..), String)
import           Text.Printf         (printf)
import           PlutusTx.Builtins   (BuiltinByteString, blake2b_256, equalsByteString)
import qualified PlutusTx.Builtins   as Builtins

-- | Raffle Details Contract for Cardano
-- 
-- Datum:
--   - Name: Text
--   - Description: Text  
--   - Pictures: Maybe [Text] (optional)
-- Redeemer:
--   - SuccessRedeemer: For successful raffle end
--   - FailureRedeemer: For failed raffle end
--
-- Spent in 2 transactions:
--   - Successful end: [ActiveRaffle, RaffleDetail] + Oracle Data --> [SuccessRaffle, ProjectFund, ServiceFee, ImplementerFee]
--   - Failure end: [ActiveRaffle, RaffleDetail] --> [GiftRedeem]

-- Datum structure for Raffle Details
data RaffleDetailsDatum = RaffleDetailsDatum
    { rdName        :: Text
    , rdDescription :: Text
    , rdPictures    :: Maybe [Text]
    } deriving (Show, Generic, ToJSON, FromJSON)

PlutusTx.makeLift ''RaffleDetailsDatum

-- Redeemer types
data RaffleDetailsRedeemer
    = SuccessRedeemer
    | FailureRedeemer
    deriving (Show, Generic, ToJSON, FromJSON)

PlutusTx.makeLift ''RaffleDetailsRedeemer

-- Active Raffle Datum structure (referenced in validation)
data ActiveRaffleDatum = ActiveRaffleDatum
    { arRaffleLicense :: BuiltinByteString
    , arTicketToken   :: AssetClass
    , arDeadline      :: POSIXTime
    , arScriptHash    :: BuiltinByteString
    } deriving (Show, Generic, ToJSON, FromJSON)

PlutusTx.makeLift ''ActiveRaffleDatum

-- Constants (these would be replaced with actual values)
raffleLicenseB64 :: BuiltinByteString
raffleLicenseB64 = "RAFFLE_LICENSE_B64" -- Replace with actual base64 value

activeRaffleScriptHashB64 :: BuiltinByteString  
activeRaffleScriptHashB64 = "ACTIVE_RAFFLE_SCRIPT_HASH_B64" -- Replace with actual base64 value

-- Validation logic
{-# INLINABLE mkRaffleDetailsValidator #-}
mkRaffleDetailsValidator :: RaffleDetailsDatum -> RaffleDetailsRedeemer -> ScriptContext -> Bool
mkRaffleDetailsValidator datum redeemer ctx = case redeemer of
    SuccessRedeemer -> validateSuccess datum ctx
    FailureRedeemer -> validateFailure datum ctx

-- Validate successful raffle end
validateSuccess :: RaffleDetailsDatum -> ScriptContext -> Bool
validateSuccess datum ctx = 
    let info = scriptContextTxInfo ctx
        inputs = txInfoInputs info
        currentTime = txInfoValidRange info
        
        -- Get the first input (ActiveRaffle)
        activeRaffleInput = case inputs of
            (input:_) -> input
            _         -> traceError "No inputs found"
            
        -- Extract ActiveRaffle datum
        activeRaffleDatum = case txOutDatum (txInInfoResolved activeRaffleInput) of
            ScriptDatum d -> case PlutusTx.fromBuiltinData d of
                Just ard -> ard
                Nothing  -> traceError "Invalid ActiveRaffle datum"
            _ -> traceError "ActiveRaffle datum not found"
            
        -- Get the current raffle details input (SELF)
        selfInput = case filter (\i -> txInInfoOutRef i == ownInput) inputs of
            (input:_) -> input
            _         -> traceError "Self input not found"
            
        ownInput = case findOwnInput ctx of
            Just input -> txInInfoOutRef input
            Nothing    -> traceError "Own input not found"
            
        -- Validation checks
        correctActiveRaffleFormat = 
            -- Check if ActiveRaffle script hash matches
            equalsByteString 
                (blake2b_256 (validatorHash (txOutValidator (txInInfoResolved activeRaffleInput))))
                (arScriptHash activeRaffleDatum)
                
        correctRaffleLicense = 
            -- Check if ActiveRaffle has correct raffle license
            equalsByteString (arRaffleLicense activeRaffleDatum) raffleLicenseB64
            
        correctTicketToken = 
            -- Check if ActiveRaffle has the same ticket token as this contract
            let selfTokens = txOutValue (txInInfoResolved selfInput)
                activeRaffleTokens = txOutValue (txInInfoResolved activeRaffleInput)
            in assetClassValueOf selfTokens (arTicketToken activeRaffleDatum) > 0 &&
               assetClassValueOf activeRaffleTokens (arTicketToken activeRaffleDatum) > 0
               
        deadlinePassed = 
            -- Check if deadline has passed
            case currentTime of
                Interval (LowerBound (Finite time) _) _ -> time > (arDeadline activeRaffleDatum)
                _ -> False
                
    in correctActiveRaffleFormat && 
       correctRaffleLicense && 
       correctTicketToken && 
       deadlinePassed

-- Validate failed raffle end  
validateFailure :: RaffleDetailsDatum -> ScriptContext -> Bool
validateFailure datum ctx = 
    let info = scriptContextTxInfo ctx
        inputs = txInfoInputs info
        currentTime = txInfoValidRange info
        
        -- Get the first input (ActiveRaffle)
        activeRaffleInput = case inputs of
            (input:_) -> input
            _         -> traceError "No inputs found"
            
        -- Extract ActiveRaffle datum
        activeRaffleDatum = case txOutDatum (txInInfoResolved activeRaffleInput) of
            ScriptDatum d -> case PlutusTx.fromBuiltinData d of
                Just ard -> ard
                Nothing  -> traceError "Invalid ActiveRaffle datum"
            _ -> traceError "ActiveRaffle datum not found"
            
        -- Get the current raffle details input (SELF)
        selfInput = case filter (\i -> txInInfoOutRef i == ownInput) inputs of
            (input:_) -> input
            _         -> traceError "Self input not found"
            
        ownInput = case findOwnInput ctx of
            Just input -> txInInfoOutRef input
            Nothing    -> traceError "Own input not found"
            
        -- Validation checks (same as success but for failure scenario)
        correctActiveRaffleFormat = 
            equalsByteString 
                (blake2b_256 (validatorHash (txOutValidator (txInInfoResolved activeRaffleInput))))
                (arScriptHash activeRaffleDatum)
                
        correctRaffleLicense = 
            equalsByteString (arRaffleLicense activeRaffleDatum) raffleLicenseB64
            
        correctTicketToken = 
            let selfTokens = txOutValue (txInInfoResolved selfInput)
                activeRaffleTokens = txOutValue (txInInfoResolved activeRaffleInput)
            in assetClassValueOf selfTokens (arTicketToken activeRaffleDatum) > 0 &&
               assetClassValueOf activeRaffleTokens (arTicketToken activeRaffleDatum) > 0
               
        deadlinePassed = 
            case currentTime of
                Interval (LowerBound (Finite time) _) _ -> time > (arDeadline activeRaffleDatum)
                _ -> False
                
    in correctActiveRaffleFormat && 
       correctRaffleLicense && 
       correctTicketToken && 
       deadlinePassed

-- Validator
validator :: Validator
validator = mkValidatorScript $$(PlutusTx.compile [|| mkRaffleDetailsValidator ||])

-- Validator hash
validatorHash :: ValidatorHash
validatorHash = Scripts.validatorHash validator

-- Address
address :: Address
address = scriptAddress validator

-- Schema definitions for contract endpoints
type RaffleDetailsSchema = Endpoint "create" (RaffleDetailsDatum, Value)
                    .\/ Endpoint "success" (RaffleDetailsDatum, RaffleDetailsDatum, Value)
                    .\/ Endpoint "failure" (RaffleDetailsDatum, Value)

-- Contract endpoints
contract :: Contract () RaffleDetailsSchema Text ()
contract = selectList [createEndpoint, successEndpoint, failureEndpoint]

-- Create raffle details
createEndpoint :: Promise () RaffleDetailsSchema Text ()
createEndpoint = endpoint @"create" $ \(datum, value) -> do
    let tx = Constraints.mustPayToTheScript datum value
    void $ submitTxConstraints validator tx
    logInfo @String $ printf "Created raffle details: %s" (show datum)

-- Success endpoint
successEndpoint :: Promise () RaffleDetailsSchema Text ()
successEndpoint = endpoint @"success" $ \(activeRaffleDatum, raffleDetailsDatum, value) -> do
    let redeemer = SuccessRedeemer
        tx = Constraints.mustSpendScriptOutput 
                (txOutRef 0) -- ActiveRaffle input
                (Redeemer $ PlutusTx.toBuiltinData redeemer)
             <> Constraints.mustSpendScriptOutput
                (txOutRef 1) -- RaffleDetails input (self)
                (Redeemer $ PlutusTx.toBuiltinData redeemer)
             <> Constraints.mustPayToAddress (Address (PubKeyHash "projectFundAddress")) value
    void $ submitTxConstraints validator tx
    logInfo @String "Raffle ended successfully"

-- Failure endpoint  
failureEndpoint :: Promise () RaffleDetailsSchema Text ()
failureEndpoint = endpoint @"failure" $ \(activeRaffleDatum, value) -> do
    let redeemer = FailureRedeemer
        tx = Constraints.mustSpendScriptOutput 
                (txOutRef 0) -- ActiveRaffle input
                (Redeemer $ PlutusTx.toBuiltinData redeemer)
             <> Constraints.mustSpendScriptOutput
                (txOutRef 1) -- RaffleDetails input (self)
                (Redeemer $ PlutusTx.toBuiltinData redeemer)
             <> Constraints.mustPayToAddress (Address (PubKeyHash "giftRedeemAddress")) value
    void $ submitTxConstraints validator tx
    logInfo @String "Raffle ended in failure"

-- Schema definitions
mkSchemaDefinitions ''RaffleDetailsSchema

-- Known currencies
mkKnownCurrencies [] 