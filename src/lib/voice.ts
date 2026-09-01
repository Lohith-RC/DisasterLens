/**
 * Voice Guidance Module — Web Speech API
 * Hands-free audio announcements for the Rescuer Command Terminal.
 * SSR-safe: all calls guarded against window/speechSynthesis unavailability.
 */

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

/**
 * Speak a message aloud.
 * @param text The text to synthesise.
 * @param priority 'alert' cancels any in-progress speech before speaking; 'normal' queues after current.
 */
export function speak(text: string, priority: 'alert' | 'normal' = 'normal') {
  const synth = getSynth();
  if (!synth) return;
  if (priority === 'alert') synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  synth.speak(utterance);
}

/**
 * Structured triage announcement for new incoming SOS signals.
 */
export function announceTriage(
  rank: string,
  disasterType: string,
  distanceKm: number | null,
  bearing: string | null
) {
  const parts = [`${rank} priority alert.`, `Incident type: ${disasterType}.`];
  if (distanceKm !== null) parts.push(`Distance: ${distanceKm.toFixed(1)} kilometres.`);
  if (bearing) parts.push(`Bearing: ${bearing}.`);
  parts.push('Acknowledge and dispatch.');
  speak(parts.join(' '), 'alert');
}

/**
 * Dispatch confirmation announcement.
 */
export function announceDispatch(victimName: string) {
  speak(`Rescue unit dispatched to ${victimName}. En route.`, 'normal');
}

/**
 * Resolution confirmation announcement.
 */
export function announceResolved() {
  speak('Signal resolved. Operation complete. Stand by for next assignment.', 'normal');
}
