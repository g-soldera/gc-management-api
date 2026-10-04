const { supabase } = require('./supabase');
const logger = require('./logger');

/**
 * Reset weekly missions for all users
 * Creates new records with status 'A fazer' for the new week
 * Does NOT delete historical data
 */
async function resetWeeklyMissions(targetDate = null) {
  const resetDate = targetDate || new Date().toISOString().split('T')[0];
  
  logger.info(`Starting weekly reset for date: ${resetDate}`);
  
  const weeklyFields = [
    'status_void_unificado_semanal',
    'status_void_4_semanal',
    'status_wl_semanal',
    'status_fornalha_infernal_semanal',
    'status_altar_ruina_semanal',
    'status_abissal_semanal',
    'status_solene_semanal'
  ];
  
  let totalUpdated = 0;
  
  for (const field of weeklyFields) {
    try {
      const { data, error } = await supabase.rpc('reset_field_all_users', {
        p_field_name: field,
        p_field_value: 'A fazer',
        p_date: resetDate
      });
      
      if (error) throw error;
      
      totalUpdated += data?.affected_count || 0;
      logger.info(`Reset ${field}: ${data?.affected_count || 0} records`);
    } catch (err) {
      logger.error(`Error resetting ${field}:`, err);
    }
  }
  
  logger.info(`Weekly reset complete: ${totalUpdated} total records created`);
  return { success: true, totalUpdated, resetDate };
}

/**
 * Reset daily missions for all users
 * Creates new records with status 'A fazer' for the new day
 * Does NOT delete historical data
 */
async function resetDailyMissions(targetDate = null) {
  const resetDate = targetDate || new Date().toISOString().split('T')[0];
  
  logger.info(`Starting daily reset for date: ${resetDate}`);
  
  const dailyFields = [
    'status_tod_diario',
    'status_claustro_infinito_diario',
    'status_berkas_diario'
  ];
  
  let totalUpdated = 0;
  
  for (const field of dailyFields) {
    try {
      const { data, error } = await supabase.rpc('reset_field_all_users', {
        p_field_name: field,
        p_field_value: 'A fazer',
        p_date: resetDate
      });
      
      if (error) throw error;
      
      totalUpdated += data?.affected_count || 0;
      logger.info(`Reset ${field}: ${data?.affected_count || 0} records`);
    } catch (err) {
      logger.error(`Error resetting ${field}:`, err);
    }
  }
  
  logger.info(`Daily reset complete: ${totalUpdated} total records created`);
  return { success: true, totalUpdated, resetDate };
}

module.exports = {
  resetWeeklyMissions,
  resetDailyMissions
};
