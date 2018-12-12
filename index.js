import StockChart from './lib/kline';
import Timeseries from './lib/timeseries';
import KlineData from './mock/kline-new';

// import io from 'socket.io-client/dist/socket.io'

var chart = new StockChart('chart');
chart.setData(KlineData.data);
chart.setViewPortData();
chart.scale(2);
chart.renderAllCandle();
