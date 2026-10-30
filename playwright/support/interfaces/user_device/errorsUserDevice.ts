import { BaseValidationUserDevice } from './baseValidationUserDevice';

/**
 * @description This error is returned when no device information is found
 */
const errorUserDeviceNotFound = (sessionID: string): BaseValidationUserDevice => {
  return {
    statusCode: 404,
    errorCode: 'error.device_not_found',
    errorDescription: `No device information for session ${sessionID} found`,
  };
};

export { errorUserDeviceNotFound };
