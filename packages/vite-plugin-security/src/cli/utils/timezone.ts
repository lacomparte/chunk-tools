/**
 * 타임존 UTC 오프셋 매핑 (DST 미적용 기본값)
 * 참고: DST 적용 지역은 연 2회 조정 필요
 */
const TIMEZONE_OFFSETS: Record<string, number> = {
  'Asia/Seoul': 9,
  'Asia/Tokyo': 9,
  'Asia/Shanghai': 8,
  'Asia/Singapore': 8,
  'America/New_York': -5,
  'America/Los_Angeles': -8,
  'America/Chicago': -6,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Australia/Sydney': 11,
  'UTC': 0,
};

/**
 * HH:mm 형식 시간 파싱
 */
export const parseTime = (
  time: string,
): { hour: number; minute: number } | null => {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

/**
 * 로컬 시간을 UTC cron 표현식으로 변환
 * @param timezone IANA 타임존 (예: 'Asia/Seoul')
 * @param time HH:mm 형식 (예: '04:00')
 * @returns cron 표현식 (예: '0 19 * * *')
 */
export const localTimeToCron = (
  timezone: string,
  time: string = '04:00',
): string => {
  const parsed = parseTime(time);
  if (!parsed) {
    throw new Error(`Invalid time format: ${time}. Use HH:mm (e.g., 04:00)`);
  }

  const offset = TIMEZONE_OFFSETS[timezone] ?? 0;
  let utcHour = parsed.hour - offset;

  // 24시간 범위 조정
  if (utcHour < 0) utcHour += 24;
  if (utcHour >= 24) utcHour -= 24;

  return `${parsed.minute} ${utcHour} * * *`;
};

/**
 * 타임존 유효성 검사
 */
export const isValidTimezone = (tz: string): boolean => tz in TIMEZONE_OFFSETS;

/**
 * 시간 형식 유효성 검사
 */
export const isValidTime = (time: string): boolean => parseTime(time) !== null;

/**
 * 지원하는 타임존 목록
 */
export const SUPPORTED_TIMEZONES = Object.keys(TIMEZONE_OFFSETS);

/**
 * 타임존별 UTC 오프셋 조회
 */
export const getTimezoneOffset = (timezone: string): number =>
  TIMEZONE_OFFSETS[timezone] ?? 0;
