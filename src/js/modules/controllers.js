'use strict';

import _ from 'lodash';
import angular from 'angular';
import config from '../../config';
import FileSaver from 'angular-file-saver';
import moment from 'moment';

const controllers = angular.module('controllers', [
    FileSaver
]);

var isLogined = ($q, $state, $http) => {
    $http.get(`${config.apiServer}/apis/users/me`)
        .success((data, status, headers, config) => {
            return;
        })
        .error((data, status, headers, config) => {
            $state.go('login');
            $q.reject();
        });
}

controllers.controller('HeaderController', function(){
    const vm = this;
});

controllers.controller('SampleController', function(){
    const vm = this;
});

controllers.controller('AccountController', function(){
    const vm = this;
});

controllers.controller('DBListController', function(){
    const vm = this;
});

controllers.controller('DashboardController', ['$q', '$state', '$http', 'FileSaver', function($q, $state, $http, FileSaver){
    isLogined($q, $state, $http);
	const vm = this;

    {   // init
        vm.category1 = [];   // 분류1
        vm.category2 = [];   // 분류2
        vm.category3 = [];   // 분류3

        vm.data = [];   // 그래프 데이터
        vm.selectedData = [];   // 마우스 오버된 데이터

        vm.playList;    // 재생 여부

        vm.controllers = [];    // Export용 데이터

        // 시간 필터링
        vm.startDate = new Date();
        vm.startDate.setDate(vm.startDate.getDate() - 365);
        vm.endDate = new Date();

        // Zoom 선택자
        vm.zoom = {
            x: true,
            y: true
        };
    }

    {   // 재생기능 method
        vm.play = () => {
            vm.playList = setInterval(function() {
                    $http.get(`${config.apiServer}/apis/controllers/getControllerValue?table=${vm.selectedCategory}&startDate=${vm.startDate}&endDate=${vm.endDate}`)
                        .success((data, status, headers, config) => {
                            vm.data = _.concat(vm.data, vm.graph.init(data));
                            vm.graph.draw();
                        })
                        .error((data, status, headers, config) => {
                            console.log('err');
                            vm.stop();
                        });
                }, 1000);
        };

        vm.stop = () => {
            if (vm.playList) {
                clearInterval(vm.playList);
            }
        }

        vm.setVisible = (controller) => {
            var opacity = controller.visible ? 1 : 0;
            var selectLine = d3.select(`#${controller.key}`);
            d3.select(`#${controller.key}`).style("opacity", opacity);
        };

        vm.export = () => {
            if (!vm.controllers) {
                confirm('출력할 데이터가 없습니다.');
                return;
            }

            var result = "Timestamp,";

            for(var i=0;i < vm.controllers.length;i++) {
                result += vm.controllers[i].key.toString() + ',';
            }
            
            result += '\n';
            for (var i = 0; i < vm.controllers[0].values.length; i++) {
                result += vm.controllers[0].values[i].ItemTimeStamp + ","
                for(var j=0;j < vm.controllers.length;j++) {
                    result += vm.controllers[j].values[i].ItemCurrentValue.toString() + ',';
                }
                result += '\n';
            }

            var defaultFileName = 'export.csv';
            var type = 'application/vnd.ms-excel;charset=charset=utf-8';
            var blob = new Blob([result], { type: type });
            FileSaver.saveAs(blob, defaultFileName);
        }
    }
    
    {   // onLoaded
        $http.get(`${config.apiServer}/apis/categories/category1`)
            .success((data, status, headers, config) => {
                vm.category1 = data;
            })
            .error((data, status, headers, config) => {
                
            });
    }

    {   // 카테고리 변경
        vm.category1Changed = () => {
            vm.category2 = [];
            vm.category3 = [];

            $http.get(`${config.apiServer}/apis/categories/category2?category1=${vm.selectedCategory1}`)
                .success((data, status, headers, config) => {
                    vm.category2 = data;
                })
                .error((data, status, headers, config) => {
                    
                });
        };

        vm.category2Changed = () => {
            vm.category3 = [];

            $http.get(`${config.apiServer}/apis/categories/category3?category1=${vm.selectedCategory1}&category2=${vm.selectedCategory2}`)
                .success((data, status, headers, config) => {
                    vm.category3 = data;
                })
                .error((data, status, headers, config) => {
                    
                });
        };

        vm.category3Changed = () => {
        };
    }

    {
        vm.checkedZoom = () => {
            var zoom = d3.behavior.zoom().on("zoom", vm.graph.draw); 
            
            if (vm.zoom.x) {
                zoom.x(x);
            }

            if (vm.zoom.y) {
                zoom.y(y);
            }

            vm.graph.svg.select("rect")
                .attr("class", "pane")
                .attr("width", vm.graph.width)
                .attr("height", vm.graph.height)
                .on("mousemove", mousemove)
                .call(zoom)
                ;
        }
    }

    {   // graph method
        vm.graph = {};
        vm.graph.color = d3.scale.category10();

        vm.graph.margin = {top: 20, right: 20, bottom: 30, left: 50};
        vm.graph.width = document.getElementById("content-dashboard").offsetWidth - vm.graph.margin.left - vm.graph.margin.right;
        vm.graph.height = 500 - vm.graph.margin.top - vm.graph.margin.bottom;

        vm.graph.svg = d3.select("canvers").append("svg")
                    .attr("width", vm.graph.width + vm.graph.margin.left + vm.graph.margin.right)
                    .attr("height", vm.graph.height + vm.graph.margin.top + vm.graph.margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + vm.graph.margin.left + "," + vm.graph.margin.top + ")");

        vm.graph.init = (data) => {
            return _.map(data, (info) => {
                info.ItemTimeStamp = moment(new Date(info.ItemTimeStamp)).format('YYYY-MM-DD hh:mm:ss');
                info.ItemCurrentValue = +info.ItemCurrentValue;
                return info;
            });
        };

        vm.graph.draw = () => {
            vm.graph.svg.select("g.x.axis").call(vm.graph.xAxis);
            vm.graph.svg.select("g.y.axis").call(vm.graph.yAxis);

            var dataNest = d3.nest()
                .key(function(d) {
                    return d.ItemID;
                })
                .entries(vm.data);

            dataNest.forEach(function(d) {
                d.key = d.key.split('.').join('-');
                vm.graph.svg.select(`path.line-${d.key}`)
                    .attr("d", vm.graph.line(d.values));
            });

            vm.graph.svg.select("g.y.axis").remove();
            vm.graph.svg.select("g.x.axis").remove();

            vm.graph.svg.select("rect.x-hiden").remove();
            vm.graph.svg.select("rect.y-hiden").remove();

            vm.graph.svg.append("rect")
                .attr("class", "y-hiden")
                .attr("fill", "#ffffff")
                .attr("width", vm.graph.margin.left)
                .attr("height", vm.graph.height + vm.graph.margin.top + vm.graph.margin.bottom)
                .attr("transform", "translate(" + (-vm.graph.margin.left) + ", " + (-vm.graph.margin.top) + ")");

            vm.graph.svg.append("rect")
                .attr("class", "x-hiden")
                .attr("fill", "#ffffff")
                .attr("width", vm.graph.width)
                .attr("height", vm.graph.margin.top + vm.graph.margin.bottom)
                .attr("transform", "translate(0," + vm.graph.height + ")");

            vm.graph.svg.append("g")
                .attr("class", "y axis")
                .call(vm.graph.yAxis);

            vm.graph.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + vm.graph.height + ")")
                .call(vm.graph.xAxis);
        };

        vm.graph.setSelectedData = (datas) => {
            vm.selectedData = _.map(datas, (data) => {
                data.ItemID = data.ItemID.split('.').join('-');
                return data;
            });

            _.forEach(vm.selectedData, (data) => {
                var value = document.getElementById('current-' + data.ItemID);
                value.innerHTML = data.ItemCurrentValue;
            });
        };

        var formatDate = d3.time.format("%Y-%m-%d %X").parse;

        var x = d3.time.scale()
            .range([0, vm.graph.width]);

        var y = d3.scale.linear()
            .range([vm.graph.height, 0]);

        vm.graph.xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        vm.graph.yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");
        
        vm.graph.line = d3.svg.line()
            .x(function(d) {
                return x(formatDate(d.ItemTimeStamp)); 
            })
            .y(function(d) { 
                return y(d.ItemCurrentValue); 
            })
            .interpolate("step-after");
        
        // 줌 기능 초기화
        var zoom = d3.behavior.zoom().on("zoom", vm.graph.draw); 

        var mousemove = function() {
            var x0 = x.invert(d3.mouse(this)[0]);
            var timestamp = moment(x0).format('YYYY-MM-DD hh:mm:ss');

            function run() {
               $http.post(`${config.apiServer}/apis/controllers/getFilterValue?time=${timestamp}`, _.map(vm.controllers, 'key'))
                    .success(function(data, status, headers, config) {
                        vm.graph.setSelectedData(data);
                    })
                    .error(function(data, status, headers, config) {
                    });
            }
            
            clearTimeout(realFunction);
            var realFunction = setTimeout(run);
        };

        vm.graph.svg.select("path.line").data([vm.data]);
        vm.graph.draw();

        vm.graph.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + vm.graph.height + ")")
            .call(vm.graph.xAxis);

        vm.graph.svg.append("g")
            .attr("class", "y axis")
            .call(vm.graph.yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr('transform', 'translate(' + [vm.graph.margin.left, vm.graph.margin.top] + ')')
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Value");

        vm.graph.svg.append("rect")
            .attr("class", "pane")
            .attr("width", vm.graph.width)
            .attr("height", vm.graph.height)
            .call(zoom)
            .on("mousemove", mousemove)
            ;
    }

    vm.new = () => {
        console.log('new');
        if (!(vm.selectedCategory1 && vm.selectedCategory2 && vm.selectedCategory3)) {
            alert('분류를 선택해주세요');
            return;
        }

        $http.get(`${config.apiServer}/apis/controllers/getControllerValues?category1=${vm.selectedCategory1}&category2=${vm.selectedCategory2}&category3=${vm.selectedCategory3}&startDate=${vm.startDate}&endDate=${vm.endDate}`)
            .success((data, status, headers, config) => {
                vm.data = vm.graph.init(data);

                var formatDate = d3.time.format("%Y-%m-%d %X").parse;

                var x = d3.time.scale()
                    .range([0, vm.graph.width]);

                var y = d3.scale.linear()
                    .range([vm.graph.height, 0]);

                vm.graph.xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                vm.graph.yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");
                
                vm.graph.line = d3.svg.line()
                    .x(function(d) {
                        return x(formatDate(d.ItemTimeStamp)); 
                    })
                    .y(function(d) { 
                        return y(d.ItemCurrentValue); 
                    })
                    .interpolate("step-after");

                vm.graph.svg = d3.select("canvers").append("svg")
                    .attr("width", vm.graph.width + vm.graph.margin.left + vm.graph.margin.right)
                    .attr("height", vm.graph.height + vm.graph.margin.top + vm.graph.margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + vm.graph.margin.left + "," + vm.graph.margin.top + ")");

                // 줌기능 설정
                var zoom = d3.behavior.zoom().on("zoom", vm.graph.draw); 

                x.domain(d3.extent(vm.data, 
                    function(d) { 
                        return formatDate(d.ItemTimeStamp);
                    }
                ));

                y.domain(d3.extent(vm.data, 
                    function(d) {
                        return d.ItemCurrentValue; 
                    }
                ));

                var mousemove = function() {
                    var x0 = x.invert(d3.mouse(this)[0]);
                    var timestamp = moment(x0).format('YYYY-MM-DD hh:mm:ss');

                    function run() {
                       $http.post(`${config.apiServer}/apis/controllers/getFilterValue?time=${timestamp}`, _.map(vm.controllers, 'key'))
                            .success(function(data, status, headers, config) {
                                vm.graph.setSelectedData(data);
                            })
                            .error(function(data, status, headers, config) {
                            });
                    }
                    
                    clearTimeout(realFunction);
                    var realFunction = setTimeout(run);
                };

                vm.graph.svg.select("path.line").data([vm.data]);
                vm.graph.draw();

                vm.graph.svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + vm.graph.height + ")")
                    .call(vm.graph.xAxis);

                vm.graph.svg.append("g")
                    .attr("class", "y axis")
                    .call(vm.graph.yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr('transform', 'translate(' + [vm.graph.margin.left, vm.graph.margin.top] + ')')
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Value");

                vm.graph.svg.append("rect")
                    .attr("class", "pane")
                    .attr("width", vm.graph.width)
                    .attr("height", vm.graph.height)
                    .on("mousemove", mousemove)
                    .call(zoom)
                    ;

                var dataNest = d3.nest()
                    .key(function(d) {
                        return d.ItemID;
                    })
                    .entries(vm.data);

                // 엑셀 출력을 위한 저장
                vm.controllers = [];

                // 초기 데이터 설정
                dataNest.forEach(function(d) {
                    d.visible = true;
                    d.key = d.key.split('.').join('-');
                    vm.controllers.push(d);

                    vm.graph.svg.append("path")
                        .data(d.values)
                        .attr("class", `line line-${d.key}`)
                        .attr("id", `${d.key}`)
                        .style("stroke", function() {
                            return d.color = vm.graph.color(d.key); 
                        })
                        .attr("d", vm.graph.line(d.values))
                        .transition()
                        .duration(2000)
                        .attrTween("stroke-dasharray", function() {
                            var len = this.getTotalLength();
                            return function(t) { return (d3.interpolateString("0," + len, len + ",0"))(t) };
                        });
                });

        })
        .error((data, status, headers, config) => {
            console.log('err');
        });
    };

    vm.add = () => {
        console.log('add');
        
        if (!(vm.selectedCategory1 && vm.selectedCategory2 && vm.selectedCategory3)) {
            alert('분류를 선택해주세요');
            return;
        }

        $http.get(`${config.apiServer}/apis/controllers/getControllerValues?category1=${vm.selectedCategory1}&category2=${vm.selectedCategory2}&category3=${vm.selectedCategory3}&startDate=${vm.startDate}&endDate=${vm.endDate}`)
            .success((data, status, headers, config) => {
                vm.data = _.concat(vm.data, vm.graph.init(data));
                
                x.domain(d3.extent(vm.data, 
                    function(d) { 
                        return formatDate(d.ItemTimeStamp);
                    }
                ));

                y.domain(d3.extent(vm.data, 
                    function(d) {
                        return d.ItemCurrentValue; 
                    }
                ));

                zoom.x(x);
                zoom.y(y);

                var dataNest = d3.nest()
                    .key(function(d) {
                        return d.ItemID;
                    })
                    .entries(vm.data);

                // 초기 데이터 설정
                dataNest.forEach(function(d) {
                    d.visible = true;
                    d.key = d.key.split('.').join('-');

                    var duplication = _.find(vm.controllers, (controller) => {
                        if (controller.key === d.key) {
                            // 중복인 경우
                            return true;
                        }

                        return false;
                    });

                    if (!duplication) {
                        vm.controllers.push(d);

                        vm.graph.svg.append("path")
                            .data(d.values)
                            .attr("class", `line line-${d.key}`)
                            .attr("id", `${d.key}`)
                            .style("stroke", function() {
                                return d.color = vm.graph.color(d.key); 
                            })
                            .attr("d", vm.graph.line(d.values))
                            .transition()
                            .duration(2000)
                            .attrTween("stroke-dasharray", function() {
                                var len = this.getTotalLength();
                                return function(t) { return (d3.interpolateString("0," + len, len + ",0"))(t) };
                            });
                            
                        vm.graph.draw();
                    } 

                });
        })
        .error((data, status, headers, config) => {
            console.log('err');
        });
    }
}]);

controllers.controller('LoginController', ['$http', '$state', function($http, $state){
    const vm = this;

    vm.form = {
        id: '',
        pw: ''
    }

    vm.login = () => {
        $http.post(`${config.apiServer}/apis/users/me`, vm.form)
            .success(function(data, status, headers, config) {
                $state.go('dashboard');
            })
            .error(function(data, status, headers, config) {
                alert('잘못된 계정입니다.');
                $state.reload();
            });
    };

    vm.logout = () => {
        $http.delete(`${config.apiServer}/apis/users/me`)
            .success(function(data, status, headers, config) {
                $state.go('login');
            })
            .error(function(data, status, headers, config) {
                $state.reload();
            });
    }
}]);

export default controllers;
