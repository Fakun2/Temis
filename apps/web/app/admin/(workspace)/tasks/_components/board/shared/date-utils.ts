export function getCalendarAnchor(tasks: Array<{ endDate: string | null }>) {
  const firstDatedTask = tasks.find((task) => task.endDate);

  return firstDatedTask?.endDate
    ? new Date(`${firstDatedTask.endDate.slice(0, 10)}T00:00:00.000Z`)
    : new Date();
}

export function getMonthDays(anchor: Date) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const leadingEmptyDays = (firstDay.getUTCDay() + 6) % 7;
  const days: Array<{ date: Date | null; key: string }> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push({ date: null, key: `empty-start-${index}` });
  }

  for (let day = 1; day <= lastDay.getUTCDate(); day += 1) {
    const date = new Date(Date.UTC(year, month, day));
    days.push({ date, key: toDateKey(date) });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: null, key: `empty-end-${days.length}` });
  }

  return days;
}

export function groupTasksByDay<TTask extends { endDate: string | null }>(tasks: TTask[]) {
  const grouped = new Map<string, TTask[]>();

  for (const task of tasks) {
    if (!task.endDate) {
      continue;
    }

    const key = task.endDate.slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), task]);
  }

  return grouped;
}

export function getYesterdayDateKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(yesterday);
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
