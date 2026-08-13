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

  const actionUrl = notification.actionUrl || rawData.actionUrl || '';
  const taskMatch = actionUrl.match(/\/cultivation-tasks\/([a-f0-9-]+)/i);
  const planMatch = actionUrl.match(/\/(?:cultivation-plans|cultivation-logbooks|logbooks)\/([a-f0-9-]+)/i);
  const plotMatch = actionUrl.match(/\/land-plots\/([a-f0-9-]+)/i);

  const fullText = `${notification.title || ''} ${notification.content || notification.message || notification.body || ''}`;
  const quotes = Array.from(fullText.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  const extractedTaskName = quotes[0] || null;
  const extractedPlanName = quotes[1] || null;

  const taskId = valueOf(
    taskMatch ? taskMatch[1] : null,
    notification.taskId, notification.cultivationTaskId, notification.targetTaskId,
    rawData.taskId, rawData.cultivationTaskId, rawData.id,
    notification.targetType === 'TASK' ? notification.targetId : null,
    notification.targetType === 'CULTIVATION_TASK' ? notification.targetId : null,
    notification.type?.includes('TASK') ? notification.targetId : null
  );

  const planId = valueOf(
    planMatch ? planMatch[1] : null,
    notification.planId, notification.cultivationPlanId, notification.logbookId, notification.cultivationLogbookId,
    rawData.planId, rawData.logbookId, rawData.cultivationPlanId,
    notification.targetType === 'PLAN' || notification.targetType === 'LOGBOOK' ? notification.targetId : null,
    notification.type?.includes('PLAN') || notification.type?.includes('LOGBOOK') ? notification.targetId : null
  );

  const plotId = valueOf(
    plotMatch ? plotMatch[1] : null,
    notification.landPlotId, notification.plotId, rawData.landPlotId, rawData.plotId,
    notification.targetType === 'PLOT' || notification.targetType === 'LAND_PLOT' ? notification.targetId : null
  );

  const farmerId = valueOf(
    notification.farmerId, notification.userId, rawData.farmerId, rawData.userId,
    notification.targetType === 'FARMER' || notification.targetType === 'USER' ? notification.targetId : null
  );

  const targetId = valueOf(taskId, planId, plotId, farmerId, notification.targetId, notification.entityId, notification.referenceId);
  const typeStr = String(valueOf(notification.type, notification.notificationType, notification.targetType, notification.category, '')).toUpperCase();
  const titleMsg = fullText.toLowerCase();

  // 1. Task navigation
  if (taskId || extractedTaskName || typeStr.includes('TASK') || typeStr.includes('DAILY_LOG') || typeStr.includes('SUMMARY') || titleMsg.includes('công việc') || titleMsg.includes('nhiệm vụ') || titleMsg.includes('nhật ký') || titleMsg.includes('thu hoạch') || titleMsg.includes('giao việc') || titleMsg.includes('giao nhiệm vụ')) {
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
        params: {
          focusTaskId: taskId || targetId,
          focusPlanId: planId,
          focusTaskName: extractedTaskName,
          focusPlanName: extractedPlanName,
        },
      });
      return true;
    }
  }

  // 2. Plan navigation
  if (planId || extractedPlanName || typeStr.includes('PLAN') || typeStr.includes('LOGBOOK') || titleMsg.includes('kế hoạch') || titleMsg.includes('quy trình') || titleMsg.includes('sổ ghi')) {
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
        params: {
          focusPlanId: planId || targetId,
          focusPlanName: extractedPlanName,
        },
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
    navigation.navigate('MainTabs', {
      screen: 'MyTasks',
      params: {
        focusTaskId: targetId,
        focusTaskName: extractedTaskName,
        focusPlanName: extractedPlanName,
      },
    });
    return true;
  } else {
    navigation.navigate('MainTabs', { screen: 'SupervisorPlans' });
    return true;
  }
}
