import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Client-side comfort engine that evaluates rules every 30s
 * against live HA sensor state and triggers device actions.
 */
export function useComfortEngine() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const evaluate = () => {
      const state = useAppStore.getState();
      const { rules, override } = state.comfort;

      // If override is active, skip evaluation
      if (override.active) {
        if (override.until && new Date(override.until) < new Date()) {
          // Override expired
          state.setComfortOverride({ active: false, until: undefined });
        } else {
          return;
        }
      }

      const enabledRules = rules.filter((r) => r.enabled);
      if (enabledRules.length === 0) return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      for (const rule of enabledRules) {
        // Schedule check
        if (rule.schedule === 'day') {
          if (currentTime < rule.dayStart || currentTime >= rule.dayEnd) continue;
        } else if (rule.schedule === 'night') {
          if (currentTime >= rule.dayStart && currentTime < rule.dayEnd) continue;
        }

        // Get sensor value from HA live states
        const sensorState = state.homeAssistant.liveStates[rule.sensorEntityId];
        if (!sensorState) continue;

        const sensorValue = parseFloat(sensorState.state);
        if (isNaN(sensorValue)) continue;

        // Evaluate condition with hysteresis
        const threshold = rule.threshold;
        const hyst = rule.hysteresis;
        let shouldActivate = false;

        if (rule.condition === 'above') {
          if (rule.lastState === 'active') {
            shouldActivate = sensorValue > (threshold - hyst);
          } else {
            shouldActivate = sensorValue > (threshold + hyst);
          }
        } else {
          // below
          if (rule.lastState === 'active') {
            shouldActivate = sensorValue < (threshold + hyst);
          } else {
            shouldActivate = sensorValue < (threshold - hyst);
          }
        }

        const newState = shouldActivate ? 'active' : 'inactive';
        if (newState !== rule.lastState) {
          // State changed — trigger action
          state.updateComfortRule(rule.id, {
            lastState: newState,
            lastTriggered: new Date().toISOString(),
          });

          // Apply action to target device
          const targetAction = rule.targetAction;
          if (shouldActivate) {
            if (targetAction === 'on') {
              state.updateDeviceState(rule.targetDeviceId, { on: true });
            } else if (targetAction === 'off') {
              state.updateDeviceState(rule.targetDeviceId, { on: false });
            } else {
              // Percentage
              const pct = parseInt(targetAction, 10);
              if (!isNaN(pct)) {
                state.updateDeviceState(rule.targetDeviceId, { on: true, speed: pct });
              }
            }
          } else {
            // Deactivate — turn off device
            state.updateDeviceState(rule.targetDeviceId, { on: false });
          }

          state.pushActivity({
            deviceId: rule.targetDeviceId,
            kind: 'state_change',
            category: 'system',
            title: `Klimatregel "${rule.name}" ${shouldActivate ? 'aktiverad' : 'avaktiverad'}`,
            detail: `Sensor: ${sensorValue.toFixed(1)} ${rule.condition === 'above' ? '>' : '<'} ${threshold}`,
            severity: 'info',
          });
        }
      }
    };

    evaluate();
    intervalRef.current = setInterval(evaluate, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
