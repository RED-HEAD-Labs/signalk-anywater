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
    //app.error("response.statusCode: " + response.statusCode)
    //app.error("response.statusText: " + response.statusText)
  }

  function startLoading(props, addr) {
    load(props, addr)
    let timer = setInterval(() => {
      loadInfo(props, addr)
    }, (props.refreshRate || 5)  * 1000)
    onStop.push(() => clearInterval(timer))
  }

  function loadInfo(props, addr) {
    request({
        url: `${addr}`,
        method: 'GET',
      }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          setProviderStatus(`Connected to ${addr}`)

          if (sentUnavailableAlarm) {
            sentUnavailableAlarm = false
            app.handleMessage(plugin.id,
                              getAlarmDelta(app,
                                            'notifications.redheadlabs.awUnavailable',
                                            'normal',
                                            'The AnyWater alarm system is now available'))
          }

          var values = [
            {
              path: 'anyWater.channel0',
              value: 0
            },
            {
              path: 'anyWater.channel1',
              value: 0
            },
            {
              path: 'anyWater.channel2',
              value: 0
            },
            {
              path: 'anyWater.channel3',
              value: 0
            },
            {
              path: 'anyWater.channel4',
              value: 0
            },
            {
              path: 'anyWater.channel5',
              value: 0
            },
            {
              path: 'anyWater.channel6',
              value: 0
            },
            {
              path: 'anyWater.channel7',
              value: 0
            },
          ]

          app.handleMessage(plugin.id, {
            updates: [
              {
                values: values
              }
            ]
          })
        } else {
          app.handleMessage(plugin.id,
                            getAlarmDelta(app,
                                          'notifications.redheadlabs.awUnavailable',
                                          'alert',
                                          'The AnyWater alarm system is unavailable'))
          sentUnavailableAlarm = true
          printRequestError(error, response)
        }
      })
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
