/**
 * Utility for routing notification taps directly to target screens.
 */
import { valueOf } from '../../../shared/utils/data';

export function navigateToNotificationTarget(notification, navigation, userRole) {
  if (!notification || !navigation) return false;

  const isSupervisor = String(userRole || '').toUpperCase().includes('SUPERVISOR');

  let rawData = {};
  if (typeof notification.data === 'string') {
    try { rawData = JSON.parse(notification.data); } catch (e) { rawData = {}; }
  } else if (typeof notification.data === 'object' && notification.data) {
    rawData = notification.data;
  }

  const taskId = valueOf(
    notification.taskId, notification.cultivationTaskId, notification.targetTaskId,
    rawData.taskId, rawData.cultivationTaskId, rawData.id,
    notification.targetType === 'TASK' ? notification.targetId : null,
    notification.targetType === 'CULTIVATION_TASK' ? notification.targetId : null,
    notification.type?.includes('TASK') ? notification.targetId : null
  );

  const planId = valueOf(
    notification.planId, notification.cultivationPlanId, notification.logbookId, notification.cultivationLogbookId,
    rawData.planId, rawData.logbookId, rawData.cultivationPlanId,
    notification.targetType === 'PLAN' || notification.targetType === 'LOGBOOK' ? notification.targetId : null,
    notification.type?.includes('PLAN') || notification.type?.includes('LOGBOOK') ? notification.targetId : null
  );

  const plotId = valueOf(
    notification.landPlotId, notification.plotId, rawData.landPlotId, rawData.plotId,
    notification.targetType === 'PLOT' || notification.targetType === 'LAND_PLOT' ? notification.targetId : null
  );

  const farmerId = valueOf(
    notification.farmerId, notification.userId, rawData.farmerId, rawData.userId,
    notification.targetType === 'FARMER' || notification.targetType === 'USER' ? notification.targetId : null
  );

  const targetId = valueOf(taskId, planId, plotId, farmerId, notification.targetId, notification.entityId, notification.referenceId);
  const typeStr = String(valueOf(notification.type, notification.notificationType, notification.targetType, notification.category, '')).toUpperCase();
  const titleMsg = `${notification.title || ''} ${notification.message || notification.content || notification.body || ''}`.toLowerCase();

  // 1. Task navigation
  if (taskId || typeStr.includes('TASK') || typeStr.includes('DAILY_LOG') || typeStr.includes('SUMMARY') || titleMsg.includes('công việc') || titleMsg.includes('nhiệm vụ') || titleMsg.includes('nhật ký') || titleMsg.includes('thu hoạch') || titleMsg.includes('giao việc') || titleMsg.includes('giao nhiệm vụ')) {
    if (isSupervisor) {
      if (taskId || targetId) {
        navigation.navigate('SupervisorTaskDetail', { taskId: taskId || targetId });
        return true;
      }
      navigation.navigate('MainTabs', { screen: 'SupervisorPlans' });
      return true;
    } else {
      navigation.navigate('MainTabs', {
        screen: 'MyTasks',
        params: { focusTaskId: taskId || targetId },
      });
      return true;
    }
  }

  // 2. Plan navigation
  if (planId || typeStr.includes('PLAN') || typeStr.includes('LOGBOOK') || titleMsg.includes('kế hoạch') || titleMsg.includes('quy trình') || titleMsg.includes('sổ ghi')) {
    if (isSupervisor) {
      if (planId || targetId) {
        navigation.navigate('SupervisorPlanDetail', { planId: planId || targetId });
        return true;
      }
      navigation.navigate('MainTabs', { screen: 'SupervisorPlans' });
      return true;
    } else {
      navigation.navigate('MainTabs', {
        screen: 'MyTasks',
        params: { focusPlanId: planId || targetId },
      });
      return true;
    }
  }

  // 3. Land plot navigation
  if (plotId || typeStr.includes('PLOT') || titleMsg.includes('vùng trồng') || titleMsg.includes('thửa đất') || titleMsg.includes('mảnh đất')) {
    if (isSupervisor && (plotId || targetId)) {
      navigation.navigate('LandPlotDetail', { landPlotId: plotId || targetId });
      return true;
    }
    navigation.navigate('MainTabs', { screen: isSupervisor ? 'LandPlots' : 'MyTasks' });
    return true;
  }

  // 4. Farmer navigation
  if (farmerId || typeStr.includes('FARMER') || titleMsg.includes('nông dân')) {
    if (isSupervisor && (farmerId || targetId)) {
      navigation.navigate('FarmerDetail', { farmerId: farmerId || targetId });
      return true;
    }
    navigation.navigate('MainTabs', { screen: isSupervisor ? 'Farmers' : 'MyTasks' });
    return true;
  }

  // Default fallback
  if (!isSupervisor) {
    navigation.navigate('MainTabs', { screen: 'MyTasks', params: { focusTaskId: targetId } });
    return true;
  } else {
    navigation.navigate('MainTabs', { screen: 'SupervisorPlans' });
    return true;
  }
}
