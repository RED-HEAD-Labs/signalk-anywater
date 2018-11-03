/*
 * This work is based on a template plugin created by Scott Bender <scott@scottbender.net>
 *
 * Scott's guidance and assistance were critical in the development of this project.
 *
 * Modification and transformation of the template to the AnyWater Alarm plugin was
 * done by Jeffrey Siegel, MV RED HEAD <jeff@mvredhead.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//const fs = require('fs')
//const _ = require('lodash')
const request = require("request")

module.exports = function(app) {
  var plugin = {}
  var onStop = []
  var statusMessage
  var sentUnavailableAlarm

  const setProviderStatus = app.setProviderStatus
        ? (msg) => {
          app.setProviderStatus(msg)
          statusMessage = msg
        } : (msg) => { statusMessage = msg }

  const setProviderError = app.setProviderError
        ? (msg) => {
          app.setProviderError(msg)
          statusMessage = `error: ${msg}`
        } : (msg, type) => { statusMessage = `error: ${msg}` }
  
  plugin.start = function(props) {
    startLoading(props, props.address)
  };

  plugin.statusMessage = () => {
    return statusMessage
  }

  plugin.stop = function() {
    onStop.forEach(f => f())
  }

  function printRequestError(error, response) {
    setProviderError(error.message)
    app.error("error: " + error.message)
    app.error(error.stack)
    app.error(new Error().stack)
    //app.error("response.statusCode: " + response.statusCode)
    //app.error("response.statusText: " + response.statusText)
  }

  function startLoading(props, addr) {
    loadInfo(props, addr);
    let timer = setInterval(() => {
      loadInfo(props, addr)
    }, (props.refreshRate || 5)  * 1000)
    onStop.push(() => clearInterval(timer))
  }

  function loadInfo(props, addr) {
    request(
	{
        	url: `${addr}`,
        	method: 'GET'
      	}, 
	(error, response, body) => {
        	if (!error && response.statusCode === 200) {
          		setProviderStatus(`Connected to ${addr}`);

          		if (sentUnavailableAlarm) {
            			sentUnavailableAlarm = false;
            			app.handleMessage(
					plugin.id,
                              		getAlarmDelta(
						app,
                                            	'notifications.redheadlabs.awUnavailable',
                                            	'normal',
                                            	'The AnyWater alarm system is now available'
					)
				);
          		}

			var s0v = findValue(body, "input0state");
			var s1v = findValue(body, "input1state");
			var s2v = findValue(body, "input2state");
			var s3v = findValue(body, "input3state");
                        var s4v = findValue(body, "input4state");
                        var s5v = findValue(body, "input5state");
                        var s6v = findValue(body, "input6state");
                        var s7v = findValue(body, "input7state");

                        var s0state = detectState(0, s0v);
                        var s1state = detectState(1, s1v);
                        var s2state = detectState(2, s2v);
                        var s3state = detectState(3, s3v);
                        var s4state = detectState(4, s4v);
                        var s5state = detectState(5, s5v);
                        var s6state = detectState(6, s6v);
                        var s7state = detectState(7, s7v);

			if ((s0state == "ALARM")
					|| (s1state == "ALARM")
					|| (s2state == "ALARM")
					|| (s3state == "ALARM")
					|| (s4state == "ALARM")
					|| (s5state == "ALARM")
					|| (s6state == "ALARM")
					|| (s7state == "ALARM"))
				alarmState = "ALARM";
			else
				alarmState = "---";

			var values = [
            		{
              			path: 'anyWater.channel0v',
              			value: s0v
            		},
            		{
              			path: 'anyWater.channel1v',
              			value: s1v
            		},
            		{
              			path: 'anyWater.channel2v',
              			value: s2v
            		},
            		{
              			path: 'anyWater.channel3v',
              			value: s3v
            		},
            		{
              			path: 'anyWater.channel4v',
              			value: s4v
            		},
            		{
              			path: 'anyWater.channel5v',
              			value: s5v
            		},
            		{
              			path: 'anyWater.channel6v',
              			value: s6v
            		},
            		{
              			path: 'anyWater.channel7v',
              			value: s7v
            		},
                        {
                                path: 'anyWater.channel0State',
                                value: s0state
                        },                                  
                        {
                                path: 'anyWater.channel1State',
                                value: s1state
                        },
                        {
                                path: 'anyWater.channel2State',
                                value: s2state
                        },
                        {
                                path: 'anyWater.channel3State',
                                value: s3state
                        },
                        {
                                path: 'anyWater.channel4State',
                                value: s4state
                        },
                        {
                                path: 'anyWater.channel5State',
                                value: s5state
                        },
                        {
                                path: 'anyWater.channel6State',
                                value: s6state
                        },
                        {
                                path: 'anyWater.channel7State',
                                value: s7state
                        },
                        {
                                path: 'anyWater.alarmState',
                                value: alarmState
                        }
          		];

          		app.handleMessage(
				plugin.id, 
				{
            				updates: [
              				{
                				values: values
              				}
            				]
          			}
			);
        	} 
		else {
          		app.handleMessage(
				plugin.id,
				getAlarmDelta(
					app,
					'notifications.redheadlabs.awUnavailable',
					'alert',
					'The AnyWater alarm system is unavailable'
				)
			);
          		sentUnavailableAlarm = true;
          		printRequestError(error, response);
        	}
	});
  }

  plugin.id = "signalk-redheadlabs-anywater"
  plugin.name = "AnyWater Alarm"
  plugin.description = "Signal K Node Server Plugin for the AnyWater alarm system"

  plugin.schema = {
    title: plugin.name,
    required: ['address'],
    properties: {
      address: {
        type: 'string',
        title: 'DAQ access URL',
      },
      refreshRate: {
        type: 'number',
        title: 'Refresh Rate',
        description: 'The query rate in seconds',
        default: 5
      }
    }
    
  }
  return plugin;
}


function getAlarmDelta(app, path, state, message)
{
  var delta = {
      updates: [
        {
          values: [
            {
              path: path,
              value: {
                state: state,
                method: [ "visual", "sound" ],
                message: message
              }
            }]
        }
      ]
  }
  return delta;
}

function findValue(xmlDoc, tag)
{
	var opentag = "<" + tag + ">";
	var closetag = "</"+ tag + ">";
             
	index = xmlDoc.indexOf(opentag);
	startindex = index + opentag.length;
	endindex = xmlDoc.indexOf(closetag);
	v = xmlDoc.slice(startindex, endindex);
	if (v < 0)
		v = -v;
             
	return v;
}
	
function detectState(ch, v)
{
	if (v < 2.0)
		return "---";

	return "ALARM";
}
