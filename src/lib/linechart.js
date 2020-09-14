class LineChart {
    constructor($container) {
        this.$container = $($container);
        this.labels = [];
        this.values = [];

        this.ctx = this.$container[0].getContext("2d");
        var options = {
            responsive: true,
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    ticks: {
                        suggestedMin: 0,
                        suggestedMax: 50
                    }
                }]
            }
        };
        var data = {
            labels: this.labels,
            datasets: [{
                label: "Response Time",
                fillColor: "rgba(220,220,220,0.2)",
                strokeColor: "#4C8C2B",
                pointColor: " #5F6062",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(220,220,220,1)",
                data: this.values
            }]
        };
    
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: data,
            options: options
        });
    
    
    }


    addData(label, value) {
        this.chart.data.labels.push(label);
        this.chart.data.datasets.forEach((dataset) => {
            dataset.data.push(value);
        });
        this.chart.update();

        if (this.chart.data.datasets[0].data.length > 100) {
            this.removeData();
        }
    }

    removeData() {
        this.chart.data.labels.pop();
        this.chart.data.datasets.forEach((dataset) => {
            dataset.data.splice(0, 1);
        });
        this.chart.update();
    }



}

module.exports = LineChart;
