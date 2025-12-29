import JsonBigint from '@rosen-bridge/json-bigint';
import { AxiosError } from '@rosen-bridge/rate-limited-axios';

import {
  FailedError,
  NetworkError,
  UnexpectedApiError,
  ErrorHandler,
} from './error';

/**
 * handle an axios api error, considering different kinds of events which may
 * cause it
 * @param error the error object
 * @param baseMessage string to prepend the actual error message
 * @param overrideHandlers an object for overriding how different kinds of error
 * are handled
 */
const handleApiError = <
  RespondedStateHandlerReturnType = never,
  NotRespondedStateHandlerReturnType = never,
  UnknownStateHandlerReturnType = never,
>(
  error: unknown,
  baseMessage: string,
  overrideHandlers?: {
    handleRespondedState?: ErrorHandler<
      RespondedStateHandlerReturnType,
      AxiosError<{ reason: string }>
    >;
    handleNotRespondedState?: ErrorHandler<
      NotRespondedStateHandlerReturnType,
      Error
    >;
    handleUnknownState?: ErrorHandler<UnknownStateHandlerReturnType>;
  },
):
  | RespondedStateHandlerReturnType
  | NotRespondedStateHandlerReturnType
  | UnknownStateHandlerReturnType => {
  const generateErrorMessage = (partialMessage: string) =>
    `${baseMessage} ${partialMessage}`;

  const handleRespondedState =
    overrideHandlers?.handleRespondedState ??
    ((error: AxiosError<{ reason: string }>) => {
      throw new FailedError(generateErrorMessage(error.response!.data.reason));
    });
  const handleNotRespondedState =
    overrideHandlers?.handleNotRespondedState ??
    ((error: Error) => {
      throw new NetworkError(generateErrorMessage(error.message));
    });
  const handleUnknownState =
    overrideHandlers?.handleUnknownState ??
    ((error: unknown) => {
      throw new UnexpectedApiError(
        generateErrorMessage(JsonBigint.stringify(error)),
      );
    });

  if (!(error instanceof Error)) {
    return handleUnknownState(error);
  } else if (error instanceof AxiosError && error.response) {
    return handleRespondedState(error);
  } else if (error instanceof AxiosError && error.request) {
    return handleNotRespondedState(error);
  } else {
    return handleUnknownState(error.message ? error.message : error);
  }
};

export default handleApiError;
