class DateTime {
  private constructor(private date: Date) {}

  static now(): DateTime {
    return new DateTime(new Date());
  }

  static fromString(s: string): DateTime {
    return new DateTime(new Date(s));
  }

  static getMonthByNameES(month: string): string {
    switch (month.toLowerCase()) {
      case 'enero':
        return '01';
      case 'febrero':
        return '02';
      case 'marzo':
        return '03';
      case 'abril':
        return '04';
      case 'mayo':
        return '05';
      case 'junio':
        return '06';
      case 'julio':
        return '07';
      case 'agosto':
        return '08';
      case 'septiembre':
        return '09';
      case 'octubre':
        return '10';
      case 'noviembre':
        return '11';
      case 'diciembre':
        return '12';
      default:
        return '01';
    }
  }

  setMilliseconds(milliseconds: number): DateTime {
    const newDate = new Date(this.date);
    newDate.setMilliseconds(milliseconds);
    return new DateTime(newDate);
  }

  addMinutes(minutes: number): DateTime {
    const newDate = new Date(this.date);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    return new DateTime(newDate);
  }

  addDays(days: number): DateTime {
    const newDate = new Date(this.date);
    newDate.setDate(newDate.getDate() + days);
    return new DateTime(newDate);
  }

  toJSDate(): Date {
    return this.date;
  }

  toJSON(): string {
    return this.date.toJSON();
  }

  toISOString(): string {
    return this.date.toISOString();
  }
}

export default DateTime;
