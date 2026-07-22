interface AvailabilityWindow {
  startTime: string; // "09:00"
  endTime: string; // "18:00"
}

interface BusyRange {
  startAt: Date;
  endAt: Date;
}

const SLOT_STEP_MINUTES = 15;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Generates candidate start times (HH:mm) for a given day, filtering out
 * anything that overlaps an existing booking or has already passed (when
 * the requested date is today).
 */
export function computeAvailableSlots(
  windows: AvailabilityWindow[],
  busyRanges: BusyRange[],
  durationMinutes: number,
  date: string,
  now: Date,
): string[] {
  const slots: string[] = [];
  const isToday = date === now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const window of windows) {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd = timeToMinutes(window.endTime);

    for (
      let candidate = windowStart;
      candidate + durationMinutes <= windowEnd;
      candidate += SLOT_STEP_MINUTES
    ) {
      if (isToday && candidate <= nowMinutes) continue;

      const candidateStart = new Date(`${date}T${minutesToTime(candidate)}:00`);
      const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60_000);

      const overlaps = busyRanges.some(
        (busy) => candidateStart < busy.endAt && candidateEnd > busy.startAt,
      );
      if (!overlaps) slots.push(minutesToTime(candidate));
    }
  }

  return slots;
}
