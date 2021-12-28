import React from 'react';
import {View, Text} from 'react-native';
import {ScaledSheet} from 'react-native-size-matters';

import { BleManager, Device } from 'react-native-ble-plx';

import {requestLocationPermission} from 'utils/Permissions';

interface State {
  lastDevice: Device | null;
}

interface Beacon {
  name: string;
  id: string;
  rssi: number;
  txPower: number;
}

interface IncompleteBeacon {
  name: string | null;
  id: string;
  rssi: number | null;
  txPower: number | null;
}

interface Map<T> {
  [string]: T;
}

const beacons: Map<Beacon> = {};
const devices: Map<IncompleteBeacon> = {};

export default class App extends React.Component<{}, State> {
  constructor(props) {
    super(props);

    this.manager = new BleManager();

    this.state = {
      lastDevice: null,
    };
  }

  UNSAFE_componentWillMount() {
    requestLocationPermission().then((granted) => {
      if(!granted) return;
      const subscription = this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          this.scan();
          subscription.remove();
        }
      }, true);
    });
  }

  componentWillUnmount() {
    this.manager.stopDeviceScan();
  }

  scan() {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        // Handle error (scanning will be stopped automatically)
        console.log('BLE scanning error:', error);
        return;
      }

      if(!device) return;

      this.onDeviceDetected(device);
    });
  }

  onDeviceDetected(device: Device) {
    if(device.id in beacons) {
      if(device.name !== null) beacons[device.id].name = device.name;
      if(device.rssi !== null) beacons[device.id].rssi = device.rssi;
      if(device.txPowerLevel !== null) beacons[device.id].txPower = device.txPowerLevel;
    } else if(device.id in devices) {
      if(device.name !== null) devices[device.id].name = device.name;
      if(device.rssi !== null) devices[device.id].rssi = device.rssi;
      if(device.txPowerLevel !== null) devices[device.id].txPower = device.txPowerLevel;

      const d = devices[device.id];
      const isValidBeacon = d.name !== null && d.id !== null && d.rssi !== null && d.txPower !== null;
      if(isValidBeacon) {
        delete devices[d.id];
        beacons[d.id] = d;
      }
    } else {
      devices[device.id] = {
        name: device.name,
        id: device.id,
        rssi: device.rssi,
        txPower: device.txPowerLevel ?? 1,
      };
    }

    this.setState({lastDevice: device});
  }

  render() {
    const {lastDevice: device} = this.state;

    return (
      <View style={styles.container}>
        {!!device && Object.values(beacons).map((beacon: Beacon) => (
          <View style={styles.row}>
            <Text style={styles.text}>{`Name: ${beacon.name}`}</Text>
            <Text style={styles.text}>{`ID: ${beacon.id}`}</Text>
            <Text style={styles.text}>{`RSSI: ${beacon.rssi}`}</Text>
            <Text style={styles.text}>{`TX Power: ${beacon.txPower}`}</Text>
          </View>
        ))}
      </View>
    );
  }
}

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  row: {
    padding: '12@sr',
    borderBottomWidth: 0.5,
    borderBottomColor: 'gray',
  },
  text: {
    color: 'black',
  },
});