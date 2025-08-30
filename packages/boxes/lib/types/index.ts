/**
 * Enum representing the status of a raffle after the deadline has passed
 */
export enum RaffleStatus {
  /**
   * Deadline has passed but goal was not reached
   */
  FAILED = 0,

  /**
   * Deadline has passed and goal was successfully reached
   */
  SUCCESS = 1,

  /**
   * Deadline has not passed yet
   */
  PENDING = -1,
}
