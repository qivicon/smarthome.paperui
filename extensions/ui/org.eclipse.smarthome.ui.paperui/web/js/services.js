angular.module('SmartHomeManagerApp.services', []).config(function($httpProvider){
    var language = localStorage.getItem('language');
    if(language) {
        $httpProvider.defaults.headers.common['Accept-Language'] = language;
    }
	$httpProvider.interceptors.push(function($q, $injector) {
		return {
			'responseError': function(rejection) {
				$injector.get('toastService').showErrorToast('ERROR: ' + rejection.status + ' - ' + rejection.statusText);
				return $q.reject(rejection);
			}
		};
	});
}).factory('eventService', function($resource, $log) {
	
	var callbacks = [];
	var eventSrc;
	
	var initializeEventService = function() {
	    eventSrc = new EventSource('/rest/events')
	    eventSrc.addEventListener('error', function (event) {
	        if (eventSrc.readyState === 2) { // CLOSED
	            setTimeout(initializeEventService, 5000);
	        }
    	}); 
    	eventSrc.addEventListener('message', function (event) {
            var data = JSON.parse(event.data);
            $log.debug('Event received: ' + data.topic + ' - ' + data.payload);
            $.each(callbacks, function(index, element) {
            	if(data.topic.match(element.topic)) {
            		element.callback(data.topic, JSON.parse(data.payload));
            	}
            });
        });
	}
	initializeEventService();
	
	return new function() {
		this.onEvent = function(topic, callback) {
			var topicRegex = topic.replace('/', '\/').replace('*', '.*');
			callbacks.push({topic: topicRegex, callback: callback});
		}
	};
}).factory('toastService', function($mdToast, $rootScope) {
	var eventSrc = new EventSource('/rest/events');    
	return new function() {
	    var self = this;
		this.showToast = function(id, text, actionText, actionUrl) {
	    	var toast = $mdToast.simple().content(text);
	        if(actionText) {
	        	toast.action(actionText);
	        	toast.hideDelay(6000);
	        } else {
	        	toast.hideDelay(3000);
	        }
	        toast.position('bottom right');
	        $mdToast.show(toast).then(function() {
				$rootScope.navigateFromRoot(actionUrl);
			});
	    }
	    this.showDefaultToast = function(text, actionText, actionUrl) {
	    	self.showToast('default', text, actionText, actionUrl);
	    }
	    this.showErrorToast = function(text, actionText, actionUrl) {
	    	self.showToast('error', text, actionText, actionUrl);
	    }
	    this.showSuccessToast = function(text, actionText, actionUrl){
	    	self.showToast('success', text, actionText, actionUrl);
	    }
	};
}).factory('configService', function() {
    return {
        convert: function(thing, thingType, applyDefault) {
            if(thingType && thingType.configParameters) {
                for (var i = 0; i < thingType.configParameters.length; i++) {
                    var parameter = thingType.configParameters[i];
                    if(thing.configuration[parameter.name]) {
                        if(parameter.type === 'TEXT') {
                            // no conversation
                        } else if(parameter.type === 'BOOLEAN') {
                            thing.configuration[parameter.name] = new Boolean(thing.configuration[parameter.name]);
                        } else if(parameter.type === 'INTEGER' || parameter.type === 'DECIMAL') {
                            thing.configuration[parameter.name] = parseInt(thing.configuration[parameter.name]);
                        } else {
                            // no conversation
                        }
                    }
                }
            }
        },
        setDefaults: function(thing, thingType) {
            if(thingType && thingType.configParameters) {
                $.each(thingType.configParameters, function(i, parameter) {
                    if(parameter.defaultValue !== 'null') {
                        if(parameter.type === 'TEXT') {
                            thing.configuration[parameter.name] = parameter.defaultValue
                        } else if(parameter.type === 'BOOLEAN') {
                            thing.configuration[parameter.name] = new Boolean(parameter.defaultValue);
                        } else if(parameter.type === 'INTEGER' || parameter.type === 'DECIMAL') {
                            thing.configuration[parameter.name] = parseInt(parameter.defaultValue);
                        } else {
                            thing.configuration[parameter.name] = parameter.defaultValue;
                        }
                    } else {
                        thing.configuration[parameter.name] = '';
                    }
                });
            }
        }
    };
});