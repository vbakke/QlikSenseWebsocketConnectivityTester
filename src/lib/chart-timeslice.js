class ChartTimeSlice {
    constructor($container, minTime, maxTime) {
        this.numberOfSlices = 6;
        this.sliceCount = Math.pow(2, this.numberOfSlices);
        this.$container = $($container);
        this.minTime = minTime;
        this.maxTime = maxTime;
        this.lowerBoundery = undefined;
        this.upperBoundery = undefined;
    }

    hasUpperBoundery() {
        return (this.upperBoundery !== undefined);
    }

    addStatus(timeSlice, status, offset) {
        // Initiate chart if not already
        if (this.minTime === undefined) {
            this.minTime = 0;
        }
        if (this.maxTime === undefined) {
            this.maxTime = timeSlice * this.sliceCount;
            this.renderLabels();
            this.addBarDataId();
            console.log('DBG: maxTime:', this.timeSpanStr( this.maxTime));
        }

        // Find the element (including any possible offset)
        let $e = this.getNeighbour(timeSlice, offset);
        if ($e.length === 0 && timeSlice >= this.maxTime) {
            let $new = this.$chart.find('.element').first().clone();
            $new.removeClass('ok').attr('data-time', '');
            this.$chart.find('.bar').append($new);
            $e = $new;
        }

        // Set the class for the sub 
        console.log('DBG: slice:', this.timeSpanStr( timeSlice), status);
        //# let $eSub = $e.find('div');
        //# $eSub.removeClass();
        //# $eSub.addClass(status);
        $e.removeClass('waiting').addClass(status);
        if (status === 'ok') {
            this.lowerBoundery = timeSlice;
        } else if (status === 'error') {
            this.upperBoundery = timeSlice;
        }

        if (this.upperBoundery === undefined) {
            return this.lowerBoundery * 2;
        } else {
            return (this.upperBoundery + this.lowerBoundery) / 2;
        }
    }

    split (splitTime) {
        let $e = this.getBiggerElement(splitTime);
        //let $e = this.getBarElement(timeSlice);
        //#$e.find('div').removeClass();
        $e.removeClass('waiting');
        
        // Find currect size of slice
        let sliceClass = $e.attr('class').split(/\s+/).filter(x => x.startsWith('w1of'))[0];
        let sliceSize = parseInt(sliceClass.substring("w1of".length));
        
        if (sliceSize >= this.sliceCount) {
            return false;
        } else {
            // Set new (smaller) size (of current slice)
            $e.removeClass('w1of'+sliceSize).addClass('w1of'+(sliceSize*2));

            // Insert a new slice in front of the shrunk slice
            let $d = $e.clone();
            $d.attr('data-time', splitTime);
            $d.insertBefore($e);

            return true;
        }
    }

    getBarElement(timeSlice) {
        let $e = this.$chart.find('.bar .element[data-time="'+timeSlice+'"]');
        return $e;
    }
    getNeighbour(timeSlice, offset) {
        let $e = this.getBarElement(timeSlice);
        for (let i = 0; i<Math.abs(offset); i++) {
            if (offset > 0) {
                $e = $e.next();
            } else if (offset < 0) {
                $e = $e.prev();
            }   
        }
        return $e; 
    }
    getBiggerElement(timeSlice) {
        let $e = this.$chart.find('.bar .element').first();
        while ($e.length > 0 && $e.data('time') < timeSlice) {
            $e = $e.next();
        }
        return $e;
    }
    getSmallerElement(timeSlice) {
        let $e = this.$chart.find('.bar .element').last();
        while ($e.length > 0 && $e.data('time') > timeSlice) {
            $e = $e.prev();
        }
        return $e;
    }
    
    render() {
        //this.$container.empty();
        let chart = this.buildChartStr();
        let labels = this.buildLabelsStr();
        this.$chart = $('<div class="chart">'+chart+labels+'</div>');
        this.$container.append(this.$chart);
        this.renderLabels();
    }

    addBarDataId() {
        if (this.maxTime !== undefined) {
            let time = this.maxTime;
//            let pow = 1;
            let $e = this.$chart.find('.bar .element').last();
            for (let i = 0; i < this.numberOfSlices+1; i++) {
                $e.attr('data-time', time);
                time = time/ 2;
                $e =  $e.prev();
            }
        }
    }
    renderLabels() {
        if (this.maxTime !== undefined) {
            let time = this.minTime;
            let timeStr = this.timeSpanStr(time);
            this.$chart.find('.label-group .slice-label.v0').text(timeStr);
            
            time = this.maxTime;
            let pow = 1;
            for (let i = 0; i < 4; i++) {
                timeStr = this.timeSpanStr(time);
                this.$chart.find('.label-group .slice-label.v1of'+pow).text(timeStr);
                time = (time + this.minTime) / 2;
                pow = pow+pow;
            }
            let time1 = this.maxTime / this.sliceCount;
            if (time1 >= 1*1000) {
                timeStr = this.timeSpanStr(time1);
                this.$chart.find('.label-group .slice-label.v1of'+this.sliceCount).text(timeStr);
            }
        }
    }
        
    buildChartStr() {
        let html = `
            <div class="bar" >
                <div class="element w1of64" ><div></div></div>
                <div class="element w1of64" ><div></div></div>
                <div class="element w1of32" ><div></div></div>
                <div class="element w1of16" ><div></div></div>
                <div class="element w1of8" ><div></div></div>
                <div class="element w1of4" ><div></div></div>
                <div class="element w1of2" ><div></div></div>
            </div>`;
        return html;
    }
    buildLabelsStr() {
        let html = `
                <div class="label-group">
                    <div class="slice-label v0"></div>
                    <div class="slice-label v1of64"></div>
                    <div class="slice-label v1of32"></div>
                    <div class="slice-label v1of16"></div>
                    <div class="slice-label v1of8"></div>
                    <div class="slice-label v1of4"></div>
                    <div class="slice-label v1of2"></div>
                    <div class="slice-label v1of1"></div>
                </div>
            </div>`;
        
        return html;
    }



    timeSpanStr (timespan) {
        var str = '';
        if (timespan === 0) {
            str = "0";
        }
        else {
            var fulltime = timespan;
            var ms = Math.round(timespan % 1000);
            timespan = Math.floor(timespan / 1000);
            var sec = timespan % 60;
            //var minFrac = timespan / 60;
            timespan = Math.floor(timespan / 60);
            var min = timespan % 60;
            var hours = Math.floor(timespan / 60);
            
            if (min < 1) {
                if (sec == '0' && ms < 1) str = ''
                else {
                    str = (ms < 1) ? '' : '.'+ms;
                    str = sec + str + ' sec';
                }
            } else {
                str = ((sec) ? min+':'+ (''+sec).padStart(2, '0') : min) + ' min ' ;
            }
            if (hours > 0) str = hours + ((hours==1)?' hour ':' hours ') + str;
        }
        return str;
    }
    dateStr(now) {
        now = now || new Date();
            
        return now.toISOString().slice(0,10);
    }
    timeStr(now) {
        now = now || new Date();
    
        var tzo = -now.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num, minLength) {
                minLength = minLength || 2;
                var norm = Math.floor(Math.abs(num)).toString();
                var len = norm.length;
                var str = '';
                for (let i = len; i < minLength; i++) { str += '0'  }
                str += norm;
                return str;
            };
        return pad(now.getHours()) +
            ':' + pad(now.getMinutes()) +
            ':' + pad(now.getSeconds()) +
            '.' + pad(now.getMilliseconds(), 3) +
            ' ' + dif + pad(tzo / 60) +
            ':' + pad(tzo % 60);
    }
    
    timeStampStr(now) {
        now = now || new Date();
    
        var tzo = -now.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num, minLength) {
                minLength = minLength || 2;
                var norm = Math.floor(Math.abs(num)).toString();
                var len = norm.length;
                var str = '';
                for (let i = len; i < minLength; i++) { str += '0'  }
                str += norm;
                return str;
            };
        return now.getFullYear() +
            '-' + pad(now.getMonth() + 1) +
            '-' + pad(now.getDate()) +
            '  ' + pad(now.getHours()) +
            ':' + pad(now.getMinutes()) +
            ':' + pad(now.getSeconds()) +
            '.' + pad(now.getMilliseconds(), 3) +
            ' ' + dif + pad(tzo / 60) +
            ':' + pad(tzo % 60);
    }
    

}

module.exports = ChartTimeSlice;
