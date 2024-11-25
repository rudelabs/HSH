/* eslint-disable prettier/prettier */
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { tableHeader, text } from './styles/MainStyle';
import Icon from 'react-native-vector-icons/FontAwesome';
import IconE from 'react-native-vector-icons/Entypo';
import { useTranslation } from 'react-i18next';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { check, PERMISSIONS, request, requestMultiple, RESULTS } from 'react-native-permissions';
import {
  BLEPrinter,
  ColumnAlignment,
  COMMANDS,
} from 'react-native-thermal-receipt-printer-image-qr';
import SideBar from './ui/SideBar';
// import RightDeliveryDetails from './ui/RightDeliveryDetails';
import {
  Table,
  TableWrapper,
  Row,
  Cell,
} from 'react-native-table-component';
import { getVehicle, getDomain } from './functions/helper';
import { moderateScale, verticalScale } from './styles/Metrics';
import { Checkbox, ActivityIndicator, MD2Colors, Avatar, Button, TextInput } from 'react-native-paper';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DialogComp from './DialogComp'

const { width } = Dimensions.get('window');

export default function DeliveryOrder({ navigation, route }) {
  const domain = getDomain();
  const { t, i18n } = useTranslation();
  const parameter = getVehicle();
  const [showInput, setshowInput] = useState(false);
  const [TotalLitres, setTotalLitres] = useState(0);
  const [minDate, setminDate] = useState(null);
  const [checked, setChecked] = useState([])
  const [orderList, setOrderList] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailData, setdetailData] = useState([])
  const [showDate, setShowDate] = useState(false)
  const headerData = ['     ', 'DO No.', 'Delivery Address', 'Liters', 'Status']
  const [dateInput, setDateInput] = useState(new Date());
  const [formattedDate, setFormattedDate] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [uniqueOrdersArray, setUniqueOrdersArray] = useState([])

  const showDatePicker = () => {
    console.log(parameter)
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    // console.warn("A date has been picked: ", formatDate(new Date(date).toLocaleDateString()));
    getDeliveryOrder(formatDate(new Date(date)))
    hideDatePicker();
    setDateInput(new Date(date));

  };

  const formatDate = (inputDate) => {

    let day = inputDate.getDate();

    let month = inputDate.getMonth() + 1;

    let year = inputDate.getFullYear();
    if (day < 10) {
      day = '0' + day;
    }

    if (month < 10) {
      month = `0${month}`;
    }

    let formatted = `${year}-${month}-${day}`;
    return formatted;
  };

  useEffect(() => {
    console.log("This is orderlist _________>>>>>>", orderList)
  }, [orderList])
  // useEffect(() => { console.log("This is unique object array ---->", uniqueOrdersArray); }, [uniqueOrdersArray])

  useEffect(() => {
    getDeliveryOrder(formatDate(new Date()))
    var currentDate = new Date();

    // Subtract 14 days (2 weeks)
    var twoWeeksAgo = new Date(currentDate.getTime() - (14 * 24 * 60 * 60 * 1000));

    // Extract the year, month, and day
    var year = twoWeeksAgo.getFullYear();
    var month = twoWeeksAgo.getMonth() + 1; // Month is zero-based
    var day = twoWeeksAgo.getDate();

    // Format the date as desired (e.g., YYYY-MM-DD)
    var formattedDate = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    console.log("formattedDate", formattedDate);
    setminDate(new Date(formattedDate));
    return () => {
      // getDeliveryOrder(formatDate(new Date()))
    }

  }, [])

  const removeDuplicates = (array) => {
    var uniqueUIDs = [];
    var uniqueArray = [];
    array.forEach(val => {
      var pos = uniqueUIDs.indexOf(val.UID);
      if (pos == -1) {
        val.products = [{ DISPLAY_NAME: val.DISPLAY_NAME, UNIT_AMT: val.UNIT_AMT, UOM_CODE: val.UOM_CODE, QTY: val.qty_order }]; // adding the properties here.
        uniqueArray.push(val);
        uniqueUIDs.push(val.UID);
      }
      else {
        uniqueArray[pos].products.push({ DISPLAY_NAME: val.DISPLAY_NAME, UNIT_AMT: val.UNIT_AMT, UOM_CODE: val.UOM_CODE, QTY: val.qty_order });
      }
    })
    setUniqueOrdersArray(uniqueArray)
    return uniqueArray
  }
  const getDeliveryOrder = async (sdate) => {
    setChecked([]);
    setLoading(true);
    console.log(sdate);

    NetInfo.fetch().then(async networkState => {
      if (networkState.isConnected) {
        try {
          const response = await fetch(domain + `/getJobDetail?_token=404BF898-501C-469B-9FB0-C1C1CCDD7E29&PLATE_NO=${parameter.vehicle.VEHICLE_INFO}&date=${sdate}`);
          const json = await response.json();

          if (json && json.length > 0) {
            const uniqueOrders = removeDuplicates(json);
            setOrderList(uniqueOrders); // Update orderList with the unique data

            const transformedData = uniqueOrders.map(item => {
              console.log("unique orders", uniqueOrders)
              return [
                'Transfer',
                item?.INV_NO,
                `${item?.NAME}\n${item?.PRINT_ADDRESS}\n\nREMARK: ${item?.REMARK}`,
                item?.qty_order,
                item?.JOB_STATUS_DESC,
              ];
            });
            setTotalLitres(transformedData.reduce((acc, item) => acc + parseFloat(item[3]), 0));
            setdetailData(transformedData);
          } else {
            setOrderList([]);
            setdetailData([]);
          }
          setLoading(false);
        } catch (error) {
          setLoading(false);
          console.error(error);
        }
      } else {
        // Handle offline scenario
        const localDeliveryData = await AsyncStorage.getItem('JOBDATA');
        if (localDeliveryData && sdate === formatDate(new Date())) {
          setLoading(false);
          Alert.alert('Offline mode', 'Data in offline mode can be outdated');
          const jsDelivery = JSON.parse(localDeliveryData);
          setOrderList(jsDelivery);

          const transformedData = jsDelivery.map(item => [
            'Transfer',
            item?.INV_NO,
            `${item?.NAME}\n${item?.PRINT_ADDRESS}\n\nREMARK: ${item?.REMARK}`,
            item?.qty_order,
            item?.JOB_STATUS_DESC,
          ]);
          setdetailData(transformedData);
        } else {
          Alert.alert('You are offline');
          setOrderList([]);
          setdetailData([]);
          setLoading(false);
        }
      }
    });
  };

  // Ensure the Transfer button uses data from sorted detailData
  const handleTransfer = () => {
    if (checked.length > 0) {
      const selectedIndex = checked[0];
      const selectedOrder = orderList.find(order => order.INV_NO === sortedData[selectedIndex][1]);

      if (selectedOrder) {
        navigation.replace('TransferList', {
          info: route?.params,
          job: selectedOrder.INV_NO
        });
        setOrderList([]);
        setdetailData([]);
      }
    }
  };

  const statusColor = {
    Pending: { text: '#EA631D', button: 'rgba(255, 181, 114, 0.47)' },
    Completed: { text: '#3DB792', button: 'rgba(107, 226, 190, 0.24)' },
  };

  const elementTransfer = (data, index) => {
    return <Icon name="plus" color="#2196F3" size={'large'} />;
  };

  const onPressCheckbox = (index) => {
    if (checked.includes(index)) {
      setChecked(checked.filter((i) => i !== index))
    } else {
      setChecked([index])
    }
  }

  const sortedData = detailData?.sort((a, b) => {
    if (a[4] === 'Pending' && b[4] !== 'Pending') {
      return -1
    } else if (a[4] !== 'Pending' && b[4] === 'Pending') {
      return 1
    } else {
      return 0
    }
  })

  const element = (data, index, status) => {
    // console.log("element", status)
    if (data === 'Transfer') {
      return (
        <Text
          style={{
            color: '#fff',
            alignSelf: 'center',
          }}>
          {/* <Icon name="refresh" color="#2196F3" size={22} /> */}
          < Checkbox
            disabled={status !== 'Pending' && status !== 'Delivered'}
            status={checked.includes(index) ? 'checked' : 'unchecked'}
            onPress={() => onPressCheckbox(index)}
            color='#01315C'
          />
        </Text>
      );
    } else {
      if (index === 2) {
        return (
          <>
            <Text
              style={{
                color: statusColor[data] ? statusColor[data].text : 'black',
                alignSelf: 'flex-start',
                paddingVertical: 10
              }}>
              {data.split(',')[0]}
            </Text>
            <Text
              style={{
                color: 'black',
                alignSelf: 'flex-start',
                paddingVertical: 10,
              }}>
              {data.split(',')[1]}
            </Text>
          </>
        );
      } else {
        return (<Text
          style={{
            color: statusColor[data] ? statusColor[data].text : 'black',
            alignSelf: 'flex-start',
            paddingVertical: 10
          }}>
          {data}
        </Text>
        );
      }
    }
  };


  const [printers, setPrinters] = useState([]);
  const [printModal, setprintModal] = useState([]);

  const printHTML = async () => {
    try {
      check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT)
        .then((result) => {
          switch (result) {
            case RESULTS.UNAVAILABLE:
              requestPerm();
              break;
            case RESULTS.DENIED:
              requestPerm();

              break;
            case RESULTS.LIMITED:
              // alert('Bluetooth is limited: some actions are possible');
              // printBL();
              requestPerm();
              break;
            case RESULTS.GRANTED:
              // alert('Bluetooth is granted');
              printBL()
              break;
            case RESULTS.BLOCKED:
              alert('Bluetooth is denied and not requestable anymore');
              navigation.replace('DeliveryOrder');
              break;
          }

        })
        .catch((error) => {
          // …
        });


    } catch (err) {
      console.warn(err);
    }
  }

  const requestPerm = () => {
    requestMultiple([PERMISSIONS.ANDROID.BLUETOOTH_CONNECT, PERMISSIONS.ANDROID.BLUETOOTH_SCAN, PERMISSIONS.ANDROID.BLUETOOTH, PERMISSIONS.ANDROID.BLUETOOTH_ADMIN]).then((result) => {
      console.log('requested')
      // alert(JSON.stringify(result));
      printBL()
    }).catch(error => {
      alert('error', error);
      navigation.replace('DeliveryOrder')
    });
  }

  const printBL = async () => {
    try {
      BLEPrinter.init().then(() => {
        BLEPrinter.getDeviceList().then((data) => {
          console.log(data);
          setPrinters([...data]);
          setprintModal(true)
        }).catch(e => {
          console.log(e);
          // Alert.alert('Error: ' + e)
          // navigation.replace('DeliveryOrder')
        });
      }).catch(e => {
        Alert.alert("Bluetooth not supported: " + e);
        navigation.replace('DeliveryOrder')
      });
    }
    catch (e) {
      alert("device list failed catch block " + e);
      navigation.replace('DeliveryOrder')
    }
  }

  const _connectPrinter = (printer) => {
    //connect printer
    // alert('priniting for diesel ' + dieselValueCopy.current + ' for signature : ' + signatureURLCopy.current);
    try {
      const BOLD_ON = COMMANDS.TEXT_FORMAT.TXT_BOLD_ON;
      const BOLD_OFF = COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF;
      const CENTER = COMMANDS.TEXT_FORMAT.TXT_ALIGN_CT;
      const OFF_CENTER = COMMANDS.TEXT_FORMAT.TXT_ALIGN_LT;
      const LEFT_MARGIN = COMMANDS.MARGINS.LEFT;
      const setLeftMarginCommand = '\x1b\x6c\x00';

      // Set right margin to 0
      const setRightMarginCommand = '\x1b\x51\x00';
      BLEPrinter.connectPrinter(printer.inner_mac_address).then((data) => {
        BLEPrinter.printImage(
          `https://vellas.net/wp-content/uploads/2024/01/hshlogo3-1.webp`,
          {
            imageWidth: 300,
            imageHeight: 100,
          },
        );
        BLEPrinter.printText(`${setLeftMarginCommand}${setRightMarginCommand}${CENTER}${BOLD_ON}<M>Hock Seng Heng Transport & Trading Pte Ltd. </M>${BOLD_OFF}\n
       ${setLeftMarginCommand}${setRightMarginCommand}${CENTER}${BOLD_ON}<D>Delivery Order</D>${BOLD_OFF}\n
       ${setLeftMarginCommand}${setRightMarginCommand}<M>9 Jalan Besut Singapore 619563</M>
       ${setLeftMarginCommand}${setRightMarginCommand}<M>Tel: 6261-6101 Fax: 6261-1037</M>\n\n\n`);

        BLEPrinter.printText(`${CENTER}${BOLD_ON}<D>Thank You</D>${BOLD_OFF}\n\n`);


        setprintModal(false);
      }
      ).catch(e => {
        // alert("connecting failed then catch block " + e)
      })
    }
    catch (e) {
      alert("connecting failed catch block " + e)
    }

  }



  return (
    <View style={{ flexDirection: 'row', flex: 1, backgroundColor: 'white' }}>
      {/* <SideBar all={true} navigation={navigation} /> */}
      <Modal
        animationType='none'
        transparent={true}
        visible={loading}
      >
        <ActivityIndicator animating={true} color={MD2Colors.red800} style={{ marginTop: '25%' }} size='large' />
      </Modal>
      <View style={{ flex: 1, margin: moderateScale(10) }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('Main');
              }}>
              <Icon
                name="chevron-left"
                color="#01315C"
                size={30}
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>
            <Text style={text}>{parameter.vehicle.VEHICLE_INFO}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => {
              printHTML()
            }} style={{ marginRight: 10 }}>
              <IconE name="print" color="#01315C" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={checked.length > 0 ? false : true}
              style={{
                borderWidth: 1,
                borderColor: '#01315C',
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                padding: 10,
                opacity: checked.length > 0 ? 1 : 0.4
              }}
              onPress={
                //   () => {
                //   console.log(orderList[checked[0]]);

                //   navigation.replace('TransferList', {
                //     info: route?.params,
                //     job: orderList[checked[0]].INV_NO
                //   });
                //   setOrderList([]);
                //   setdetailData([])
                // }
                handleTransfer
              }>
              <Icon name="exchange" color="#01315C" size={20} />

              <Text style={[text, { marginLeft: 10 }]}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={showDatePicker}>
              <Avatar.Icon size={50} icon="calendar-month-outline" style={{ backgroundColor: 'white' }} color='#01315C' />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[text, { marginTop: verticalScale(15) }]}>
            {t('trips')}
          </Text>
          <Text style={[text, { marginTop: verticalScale(15) }]}>
            Total litres:{TotalLitres}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              borderBottomWidth: 3,
              borderBottomColor: '#01315C',
              marginVertical: verticalScale(10),
              width: 40,
            }}
          />
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: '#01315C',
              marginVertical: verticalScale(15),
              flex: 1,
            }}
          />
        </View>
        <Table style={{ flex: 1 }}>
          <Row
            data={headerData}
            flexArr={[0.5, 1, 2, 1, 1]}
            style={tableHeader}
            textStyle={text}
          />
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
            }}>
            {sortedData.length > 0 ? sortedData?.map((rowData, index) => (
              // <View key={index.toString()}>
              <TouchableOpacity
                key={index.toString()}
                onPress={() => {
                  navigation.replace('EditTrip', {
                    driver: orderList[0]?.DRIVER_NAME,
                    inv: orderList[0]?.INV_NO,
                    name: orderList[0]?.NAME,
                    // PO_NO: orderList[0].PO_NO,
                    qty: orderList[0]?.qty_order,
                    address1: orderList[0]?.ADDRESS2,
                    address2: orderList[0]?.PRINT_ADDRESS,
                    PLATE_NO: parameter.vehicle.VEHICLE_INFO,
                    invData: orderList.find((val) => val.INV_NO === rowData[1]), // this will only send the first one // so no issue
                    products: orderList.find(val => val.INV_NO === rowData[1]).products
                  });
                }}>
                <TableWrapper key={index} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {rowData?.map((cellData, cellIndex) => (
                    <Cell
                      flex={cellIndex == 0 ? 0.5 : cellIndex == 2 ? 2 : 1}
                      key={cellIndex}
                      data={
                        cellIndex === 0
                          ? element(cellData, index, rowData[4])
                          : cellIndex === 4
                            ? element(cellData, index)
                            : cellData
                      }
                      textStyle={
                        {
                          fontSize: width / 50,
                          color: '#01315C',
                          paddingVertical: 10,
                          backgroundColor: 'red',
                        }}
                    />
                  ))}
                </TableWrapper>
              </TouchableOpacity>
              // </View>
            )) : <>
              <Text style={{ color: 'black', fontSize: 20, textAlign: 'center', marginTop: 30, fontWeight: 'bold' }}>No Jobs for this day</Text>
            </>}
            {/* <Rows data={detailData} textStyle={dataText} /> */}
          </ScrollView>
        </Table>
      </View>
      <DialogComp visible={printModal} onClose={(val) => setprintModal(false)}>
        {
          printers.map((printer, index) => (
            <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, width: '100%' }} key={printer.inner_mac_address} onPress={() => _connectPrinter(printer)}>
              <Text style={{ color: 'black', fontSize: 15, textAlign: 'center' }}>{`${printer.device_name}(${printer.inner_mac_address})`}</Text>
            </TouchableOpacity>
          ))
        }
      </DialogComp>
      {/* <RightDeliveryDetails show={showInput} hide={() => setshowInput(false)} /> */}
      <DateTimePickerModal
        date={dateInput}
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
        minimumDate={minDate}
      // maximumDate={new Date()}
      />
    </View>
  );
}
