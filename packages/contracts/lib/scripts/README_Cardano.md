# Cardano Raffle Details Contract

This is the Cardano (Plutus/Haskell) version of the ErgoScript `raffleDetails.es` contract.

## Key Differences from ErgoScript Version

### 1. **Language & Framework**

- **ErgoScript**: Uses ErgoScript with SigmaProp and built-in functions
- **Cardano**: Uses Plutus/Haskell with UTxO model and validator functions

### 2. **Data Storage**

- **ErgoScript**: Uses registers (R4) to store data
- **Cardano**: Uses Datum attached to UTxOs

### 3. **Token Handling**

- **ErgoScript**: Direct token access via `tokens(0)._1`
- **Cardano**: Uses `AssetClass` and `assetClassValueOf` for token validation

### 4. **Time Validation**

- **ErgoScript**: Uses `HEIGHT` (block height)
- **Cardano**: Uses `POSIXTime` and transaction validity intervals

### 5. **Script Validation**

- **ErgoScript**: Uses `blake2b256(activeRaffle.propositionBytes)`
- **Cardano**: Uses `blake2b_256(validatorHash(...))`

## Contract Structure

### Datum (RaffleDetailsDatum)

```haskell
data RaffleDetailsDatum = RaffleDetailsDatum
    { rdName        :: Text
    , rdDescription :: Text
    , rdPictures    :: Maybe [Text]
    }
```

### Redeemer (RaffleDetailsRedeemer)

```haskell
data RaffleDetailsRedeemer
    = SuccessRedeemer  -- For successful raffle end
    | FailureRedeemer  -- For failed raffle end
```

## Validation Logic

The contract validates the same conditions as the ErgoScript version:

1. **Correct ActiveRaffle Format**: Verifies the ActiveRaffle script hash matches
2. **Correct Raffle License**: Ensures the ActiveRaffle has the correct raffle license token
3. **Correct Ticket Token**: Validates that both contracts have the same ticket token
4. **Deadline Passed**: Checks that the current time is past the deadline

## Usage

### 1. Create Raffle Details

```haskell
-- Create a new raffle details UTxO
let datum = RaffleDetailsDatum "My Raffle" "Description" (Just ["pic1.jpg", "pic2.jpg"])
let value = assetClassValue (AssetClass (adaSymbol, adaToken)) 1000000
```

### 2. Success Endpoint

```haskell
-- Spend both ActiveRaffle and RaffleDetails for successful end
-- Outputs: SuccessRaffle, ProjectFund, ServiceFee, ImplementerFee
```

### 3. Failure Endpoint

```haskell
-- Spend both ActiveRaffle and RaffleDetails for failed end
-- Outputs: GiftRedeem
```

## Configuration

Before using this contract, you need to:

1. **Replace Constants**:

   ```haskell
   raffleLicenseB64 = "YOUR_ACTUAL_RAFFLE_LICENSE_B64"
   activeRaffleScriptHashB64 = "YOUR_ACTIVE_RAFFLE_SCRIPT_HASH_B64"
   ```

2. **Update Addresses**:
   ```haskell
   -- Replace with actual addresses
   Address (PubKeyHash "projectFundAddress")
   Address (PubKeyHash "giftRedeemAddress")
   ```

## Compilation

To compile this contract:

```bash
# Using cabal
cabal build

# Or using nix
nix-build
```

## Testing

The contract includes endpoints for testing in the Plutus Playground:

- `create`: Create a new raffle details UTxO
- `success`: Execute successful raffle end
- `failure`: Execute failed raffle end

## Dependencies

This contract requires the following Plutus dependencies:

- `plutus-tx`
- `plutus-contract`
- `ledger`
- `playground-contract`

## Security Considerations

1. **Time Validation**: Uses POSIX time instead of block height for more precise timing
2. **Token Validation**: Comprehensive token checking using AssetClass
3. **Script Hash Verification**: Validates ActiveRaffle script integrity
4. **Error Handling**: Proper error messages for debugging

## Migration Notes

When migrating from ErgoScript to Cardano:

1. **Register to Datum**: Convert R4 register data to Datum structure
2. **Token Handling**: Update token validation logic for Cardano's AssetClass system
3. **Time Handling**: Replace HEIGHT with POSIXTime validation
4. **Script Validation**: Update script hash verification for Cardano's validator system
5. **Transaction Structure**: Adapt to Cardano's UTxO model and constraint system
