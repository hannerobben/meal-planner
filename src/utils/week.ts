import dayjs from 'dayjs';

export function currentWeekStart(firstWeekDay: number): string {
    const today = dayjs();
    const diff = (today.day() - firstWeekDay + 7) % 7;
    return today.subtract(diff, 'day').format('YYYY-MM-DD');
}
