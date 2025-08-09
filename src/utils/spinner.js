import ora from 'ora';

export class TimedSpinner {
  constructor(text) {
    this.baseText = text;
    this.startTime = Date.now();
    this.spinner = ora(text).start();
    this.updateTimer();
  }
  
  updateTimer() {
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.spinner.text = `${this.baseText} ${elapsed}s`;
    }, 1000);
  }
  
  succeed(text) {
    clearInterval(this.timer);
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.spinner.succeed(`${text} (${elapsed}s)`);
  }
  
  fail(text) {
    clearInterval(this.timer);
    this.spinner.fail(text);
  }
  
  warn(text) {
    clearInterval(this.timer);
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.spinner.warn(`${text} (${elapsed}s)`);
  }
  
  updateText(newText) {
    this.baseText = newText;
  }
  
  stop() {
    clearInterval(this.timer);
    this.spinner.stop();
  }
}