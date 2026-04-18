/**
 * Centralized feature flag management
 */
module.exports = {
  /**
   * Check if the "Who made the play" feature is enabled
   * @returns {boolean}
   */
  isWhoMadePlayEnabled: () => {
    return process.env.FEATURE_WHO_MADE_PLAY !== 'false';
  },
  
  /**
   * Check if the slow motion feature is enabled
   * @returns {boolean}
   */
  isSlowMotionEnabled: () => {
    return process.env.FEATURE_SLOW_MOTION === 'true';
  }
};