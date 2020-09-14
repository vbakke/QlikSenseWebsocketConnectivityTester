const ChartTimeSlice = require('./chart-timeslice.js');

class ChartsTimeSlice {
    constructor($container, minTime, maxTime) {
        this.$container = $($container);
        this.chart = new ChartTimeSlice($container, minTime, maxTime);
    }

    addStatus(timeSlice, status, offset) {
        let newTime = this.chart.addStatus(timeSlice, status, offset);

        if (newTime > this.chart.maxTime) {
            this.chart = new ChartTimeSlice(this.$container);
            this.chart.render();
            this.chart.addStatus(timeSlice, status);
        }

        return newTime;
    }
    split(time) {
        return this.chart.split(time);
    }
    render() {
        return this.chart.render();
    }
    getInterval() {
        return [this.chart.lowerBoundery, this.chart.upperBoundery];
    }
    getIntervalText() {
        let lower = this.chart.timeSpanStr(this.chart.lowerBoundery);
        let upper = this.chart.timeSpanStr(this.chart.upperBoundery);
        return [lower, upper];
    }
    
}

module.exports = ChartsTimeSlice;