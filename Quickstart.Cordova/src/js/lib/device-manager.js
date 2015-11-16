import {EventEmitter} from 'events';

/**
 * A class for handling all the event handling for Apache Cordova
 * @extends EventEmitter
 */
export default class DeviceManager extends EventEmitter {
  /**
   * Create  new DeviceManager instance
   */
  constructor() {
    super();
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  }

  /**
   * Handle the deviceready event
   * @see http://cordova.apache.org/docs/en/5.4.0/cordova/events/events.deviceready.html
   * @emits {deviceready} a deviceready event
   * @param {Event} the deviceready event object
   */
  onDeviceReady(e) {
    console.debug('[DeviceManager#onDeviceReady] event = ', e);

    this.emit('deviceready', e);
  }
}
