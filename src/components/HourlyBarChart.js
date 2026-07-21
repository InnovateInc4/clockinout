import React, { useState, useEffect } from "react"; // Cleaned up imports
import NumberToTime from "./NumberToTime";
import ReactApexChart from 'react-apexcharts';

const HourlyBarChart = (props) => {
    const [options, setOptions] = useState({
        series: [{ data: [] }],
        chart: { type: 'bar', height: 350 },
        plotOptions: {
            bar: {
                horizontal: true,
                dataLabels: { position: 'top' },
            }
        },
        dataLabels: {
            enabled: true,
            offsetX: -6,
            style: { fontSize: '12px', colors: ['#fff'] }
        },
        xaxis: { categories: [] },
        tooltip: { shared: true, intersect: false }
    });

    const addUpDayTotals = (data) => {
        let daysList = [];
        let daysTotal = [];

        if (Array.isArray(data) && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
                let dateHere = NumberToTime(data[i].timeIn).substring(0, 10);
                if (daysList.indexOf(dateHere) === -1) {
                    daysList.push(dateHere);
                    daysTotal.push(0);
                }
            }

            for (let i = 0; i < daysList.length; i++) {
                for (let j = 0; j < data.length; j++) {
                    let dateHere = NumberToTime(data[j].timeIn).substring(0, 10);
                    if (data[j].timeOut !== "noTimeYet" && daysList[i] === dateHere) {
                        let hours = (data[j].timeOut - data[j].timeIn) / 3600000;
                        daysTotal[i] = parseFloat((daysTotal[i] + hours).toFixed(2));
                    }
                }
            }

            
            setOptions(prev => ({
                ...prev,
                series: [{ data: daysTotal }],
                xaxis: { ...prev.xaxis, categories: daysList }
            }));
        }
    }

    
    useEffect(() => {
        if (props.employeeHours && props.employeeHours.length > 0) {
            addUpDayTotals(props.employeeHours);
        }
    }, [props.employeeHours]);

    return (
        <div className="col-md-12" id="chart">
            {options.series[0].data.length > 0 ? (
                <div className="card p-3 shadow-sm mt-3">
                    <label className="fw-bold">Daily Hours Summary</label>
                    <ReactApexChart options={options} series={options.series} type="bar" height={350} />
                </div>
            ) : null}
        </div>
    );
}

export default HourlyBarChart;