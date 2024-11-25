import {
  StyleSheet,
  Text,
  View,
  Animated,
  Dimensions,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator
} from 'react-native';
// import {
//   BLEPrinter,
// } from "react-native-thermal-receipt-printer";
import React, { useEffect, useRef, useState, createRef } from 'react';
import { check, PERMISSIONS, request, requestMultiple, RESULTS } from 'react-native-permissions';
import AwesomeAlert from 'react-native-awesome-alerts';
import {
  remarks,
  button, buttonText
} from './styles/MainStyle';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Portal, Provider, Modal, Button, MD2Colors } from 'react-native-paper';
import * as ImagePicker from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import SideBar from './ui/SideBar';
import RightInputBar from './ui/RightInputBar';
import { getVehicle, getDomain, getlogUser } from './functions/helper';
import RNPrint from 'react-native-print';
import SignatureCapture from 'react-native-signature-capture';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import BleManager from 'react-native-ble-manager';
import {
  BLEPrinter,
  ColumnAlignment,
  COMMANDS,
} from 'react-native-thermal-receipt-printer-image-qr';
import DialogComp from './DialogComp'
const { width } = Dimensions.get('window');

function moveServicesToEnd(arr) {
  // Find the index of the object with "SERIVCES" in the DISPLAY_NAME
  const index = arr.findIndex(item => item.DISPLAY_NAME.includes("SERIVCES"));

  // If the "SERIVCES" item is found in the array
  if (index !== -1) {
    // Remove the "SERIVCES" item from its current position
    const [servicesItem] = arr.splice(index, 1);
    // Push the "SERIVCES" item to the end of the array
    arr.push(servicesItem);
  }

  return arr;
}


export default function DeliveryOrder({ navigation, route }) {
  console.log("This is the Invoice data ----->===>---->", moveServicesToEnd(route?.params?.invData.products));
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false)
  const editable = route?.params?.invData.JOB_STATUS_DESC !== 'Pending' && route?.params?.invData.JOB_STATUS_DESC !== 'Delivered' ? false : true;
  const [showInput, setshowInput] = useState(!true);
  const heightMeterAfAnim = useRef(new Animated.Value(0)).current;
  const heightMeterBeAnim = useRef(new Animated.Value(0)).current;
  const [uploadtype, setuploadtype] = useState('after');
  const [moreMeterAf, setmoreMeterAf] = useState(false);
  const [moreMeterBe, setmoreMeterBe] = useState(false);
  const [remark, setRemark] = useState('')
  const domain = getDomain();

  const [modalVisible, setModalVisible] = useState(false);
  //after
  const [previewImageUri, setpreviewImageUri] = useState('');
  const [imagePreview, setimagePreview] = useState(false);
  //before
  const [previewImageUribefore, setpreviewImageUribefore] = useState('');
  const [imagePreviewbefore, setimagePreviewbefore] = useState(false);
  const [dieselValue, setDieselValue] = useState(0);
  const dieselValueCopy = useRef(0);
  // const [dieselValueCopy, setDieselValueCopy] = useState(0);
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [signature, setsignature] = useState("");
  const [signatureURL, setsignatureURL] = useState("");
  const signatureURLCopy = useRef();
  const showSignatureModal = () => setSignatureVisible(true);
  const sign = createRef();
  const saveSign = () => sign.current.saveImage();
  const resetSign = () => sign.current.resetImage();
  // console.log(route.params)
  const _onSaveEvent = (result) => {
    Alert.alert('Signature Captured Successfully!')
    // console.log(result.encoded);
    // console.log(result.pathName);
    setsignature("data:image/png;base64," + result.encoded)
    setSignatureVisible(false);
  }

  // const _onDragEvent = () => console.log('dragged')

  const [printers, setPrinters] = useState([]);
  const [visiblePint, setvisiblePint] = useState(false);
  const [printModal, setprintModal] = useState([]);


  // states for the amounts that we get from the api can be calulated here
  const taxableAmount = useRef(route?.params?.invData?.TAXABLE_AMT)
  const percentTax = useRef(route?.params?.invData?.VAT_AMT)
  const grandTotal = useRef(route?.params?.invData?.TOTAL_PAYABLE)


  const DiesalQuantityGettingFromRouteParams = useRef(route?.params?.products[0].QTY)
  console.log("This is the good one qty of diesal +++++++>", DiesalQuantityGettingFromRouteParams.current)


  const printHTML = async () => {
    console.log(route.params);
    try {
      check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT)
        .then((result) => {
          switch (result) {
            case RESULTS.UNAVAILABLE:
              // alert('BLUETOOTH is not available (on this device / in this context)');
              requestPerm();
              // BleManager.start({ forceLegacy: true }).then(() => {
              //   // Success code
              //   BleManager.enableBluetooth()
              //     .then(() => {
              //       // Success code
              //       alert("The bluetooth is already enabled or the user confirm");
              //       printBL()
              //     })
              //     .catch((error) => {
              //       // Failure code
              //       alert("The user refuse to enable bluetooth");
              //     });
              // });
              break;
            case RESULTS.DENIED:
              // alert('Bluetooth has not been requested / is denied but requestable');
              requestPerm();
              // BleManager.start({ forceLegacy: true }).then(() => {
              //   // Success code
              //   BleManager.enableBluetooth()
              //     .then(() => {
              //       // Success code
              //       alert("The bluetooth is already enabled or the user confirm");
              //       printBL()
              //     })
              //     .catch((error) => {
              //       // Failure code
              //       alert("The user refuse to enable bluetooth");
              //     });
              // });

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

  const JobDetailsAfterUpdate = async (invoiceNumber) => {
    const url = domain + `/getJOdetail?_token=404BF898-501C-469B-9FB0-C1C1CCDD7E29&invno=${invoiceNumber}`
    // console.log("this job nubmer will update now---------->", invoiceNumber);
    try {
      const response = await fetch(url)
      const json = await response.json()
      console.log("This is the updated invoice now You can now use the amount in them ---->", json)
      taxableAmount.current = json[0].TAXABLE_AMT
      percentTax.current = json[0].VAT_AMT
      grandTotal.current = json[0].TOTAL_PAYABLE
      console.log('This is the updated invoice now You can now use the amount in them ---->', taxableAmount.current, percentTax.current, grandTotal.current)
    } catch (e) {
      console.log(e)
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
    console.log("dieselValue", dieselValueCopy.current);
    console.log("signatureURL", signatureURLCopy.current);
    // alert('priniting for diesel ' + dieselValueCopy.current + ' for signature : ' + signatureURLCopy.current);
    try {
      BLEPrinter.init().then(() => {
        BLEPrinter.getDeviceList().then((data) => {
          console.log(data);
          setPrinters([...data]);
          setprintModal(true)
        }).catch(e => {
          console.log(e);
          Alert.alert('Error: ' + e)
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
      const setRightMarginCommand = '\x1b\x51\x00';

      const productArray = moveServicesToEnd(route?.params?.products)

      let printTextData = `${setLeftMarginCommand}${setRightMarginCommand}${CENTER}${BOLD_ON}<M>Hock Seng Heng Transport & Trading Pte Ltd. </M>${BOLD_OFF}\n
      ${setLeftMarginCommand}${setRightMarginCommand}${CENTER}${BOLD_ON}<D>${route?.params?.PLATE_NO}</D>${BOLD_OFF}\n
      ${setLeftMarginCommand}${setRightMarginCommand}${CENTER}${BOLD_ON}<D>Delivery Order</D>${BOLD_OFF}\n
      ${setLeftMarginCommand}${setRightMarginCommand}<M>9 Jalan Besut Singapore 619563</M>
      ${setLeftMarginCommand}${setRightMarginCommand}<M>Tel: 6261-6101 Fax: 6261-1037</M>
      ${setLeftMarginCommand}${setRightMarginCommand}<M>${BOLD_ON}Do no: ${route?.params?.invData.INV_NO}${BOLD_OFF}</M>
      ${setLeftMarginCommand}${setRightMarginCommand}<M>Po no: ${route?.params?.invData.PO_NO}${BOLD_OFF}</M>
      ${setLeftMarginCommand}${setRightMarginCommand}<M>Sales Rep: ${route?.params?.invData.SALES_PERSON_NAME}</M>
      ${setLeftMarginCommand}${setRightMarginCommand}<M>Date: ${route?.params?.invData.REC_DATE}</M>\n
      ${setLeftMarginCommand}${setRightMarginCommand}<D>${BOLD_ON}To: ${route?.params?.invData.NAME}${BOLD_OFF}</D>\n
      ${OFF_CENTER}<D>Site: ${route?.params?.invData.ADDRESS2.replaceAll('\n', " ")}</D>\n
      ${OFF_CENTER}<D>Product: \n </D>`

      for (let i = 0; i < productArray.length; i++) {
        if (productArray[i].DISPLAY_NAME.includes("Transport Charges") || productArray[i].DISPLAY_NAME.includes("Labour Charges")) {
          printTextData += `${OFF_CENTER}<D>${productArray[i].DISPLAY_NAME}</D>\n
          ${OFF_CENTER}<D>UOM: ${productArray[i].UOM_CODE}</D>\n
          ${OFF_CENTER}<D>QTY: ${BOLD_ON}${productArray[i].QTY}${BOLD_OFF}</D>\n
          ${OFF_CENTER}<D>UNIT PRICE: $${productArray[i].UNIT_AMT}</D>\n\n`
        } else {
          printTextData += `${OFF_CENTER}<D>${productArray[i].DISPLAY_NAME}</D>\n
          ${OFF_CENTER}<D>UOM: ${productArray[i].UOM_CODE}</D>\n
          ${OFF_CENTER}<D>QTY: ${BOLD_ON}${dieselValue}${BOLD_OFF}</D>\n
          ${OFF_CENTER}<D>UNIT PRICE: $${productArray[i].UNIT_AMT}</D>\n\n`
        }
      }
      // console.log("Print Text before -----> ----->", printTextData)
      // Set right margin to 0
      BLEPrinter.connectPrinter(printer.inner_mac_address).then(async (data) => {
        BLEPrinter.printImage(
          `https://vellas.net/wp-content/uploads/2024/01/hshlogo3-1.webp`,
          {
            imageWidth: 300,
            imageHeight: 100,
          },
        );
        // BLEPrinter.printImageBase64(logoB, {
        //   imageWidth: 300,
        //   imageHeight: 300,
        // });
        printTextData += `${OFF_CENTER}<D>SUB TOTAL: $ ${taxableAmount.current}</D>
        ${OFF_CENTER}<D>9% GST: $ ${percentTax.current}</D>
        ${OFF_CENTER}<D>TOTAl: $ ${grandTotal.current}</D>\n
        ${OFF_CENTER}<D>Remarks: ${remark == null ? '' : remark.replaceAll('\n', " ")}</D>\n\n\n`

        //  BLEPrinter.printText(`${OFF_CENTER}<D>SUB TOTAL: $ ${route?.params?.invData.TAXABLE_AMT}</D>
        //  ${OFF_CENTER}<D>9% GST: $ ${route?.params?.invData.VAT_AMT}</D>
        //  ${OFF_CENTER}<D>TOTAl: $ ${route?.params?.invData.TOTAL_PAYABLE}</D>\n
        //  ${OFF_CENTER}<D>Remarks: ${remark == null ? '' : remark.replaceAll('\n', " ")}</D>\n\n\n`);
        // BLEPrinter.printImageBase64(sign, {
        //   imageWidth: 300,
        //   imageHeight: 300,
        // });
        BLEPrinter.printText(printTextData)

        if (signatureURLCopy.current) {
          BLEPrinter.printImage(
            signatureURLCopy.current,
            {
              imageWidth: 300,
              imageHeight: 100,
            },
          );
        }
        BLEPrinter.printText(`${CENTER}${BOLD_ON}<D>${OFF_CENTER}Authorised Name,</D>${BOLD_OFF}
        ${CENTER}${BOLD_ON}<D>${OFF_CENTER}Signature & </D>${BOLD_OFF}
        ${CENTER}${BOLD_ON}<D>${OFF_CENTER}Company Stamp</D>${BOLD_OFF}\n\n`);

        BLEPrinter.printText(`${CENTER}${BOLD_ON}<D>Thank You</D>${BOLD_OFF}\n\n`);




        // BLEPrinter.printText(`Terms: COD\n`)`
        // BLEPrinter.printText(
        //   `${CENTER}${COMMANDS.HORIZONTAL_LINE.HR_80MM}${CENTER}`,
        // );
        // let columnAlignment = [
        //   ColumnAlignment.LEFT,
        //   ColumnAlignment.RIGHT,
        //   ColumnAlignment.RIGHT,
        // ];
        // let columnWidth = [46 - (7 + 12), 7, 12];
        // const header = ['DESCRIPTION', 'QTY', 'AMOUNT(SGD)'];
        // BLEPrinter.printColumnsText(header, columnWidth, columnAlignment, [
        //   `${BOLD_ON}`, '', '',
        // ]);

        // let orderList =
        //   [`${route?.params?.invData.DISPLAY_NAME}`, `${dieselValue}`, `${route?.params?.invData.TAXABLE_AMT}`]
        //   ;
        // BLEPrinter.printColumnsText(
        //   orderList,
        //   columnWidth,
        //   columnAlignment,
        //   [`${BOLD_OFF}`, '', ''],
        // );
        //   let orderList = [
        //     ['1. Skirt Palas Labuh Muslimah Fashion', 'x2', '500$'],
        //     ['2. BLOUSE ROPOL VIRAL MUSLIMAH FASHION', 'x4222', '500$'],
        //     [
        //       '3. Women Crew Neck Button Down Ruffle Collar Loose Blouse',
        //       'x1',
        //       '30000000000000$',
        //     ],
        //     ['4. Retro Buttons Up Full Sleeve Loose', 'x10', '200$'],
        //     ['5. Retro Buttons Up', 'x10', '200$'],
        //   ];
        //   let columnAlignment = [
        //     ColumnAlignment.LEFT,
        //     ColumnAlignment.CENTER,
        //     ColumnAlignment.RIGHT,
        //   ];
        //   let columnWidth = [46 - (7 + 12), 7, 12];
        //   const header = ['Product list', 'Qty', 'Price'];
        //   Printer.printColumnsText(header, columnWidth, columnAlignment, [
        //     `${BOLD_ON}`,
        //     '',
        //     '',
        //   ]);
        //   Printer.printText(
        //     `${CENTER}${COMMANDS.HORIZONTAL_LINE.HR3_80MM}${CENTER}`,
        //   );
        //   for (let i in orderList) {
        //     Printer.printColumnsText(
        //       orderList[i],
        //       columnWidth,
        //       columnAlignment,
        //       [`${BOLD_OFF}`, '', ''],
        //     );
        //   }
        //   BLEPrinter.printText(`\n
        //  Remarks: ${remark == null ? '' : remark}\n
        //  ZERO-RATED: 00.0\n
        //  TAXABLE: 0\n
        //  9% GST: 0\n
        //  TOTAl: 0\n`);

        //   BLEPrinter.printText(`${CENTER}Authorised Name, Signature &amp; Company Stamp`);
        //   BLEPrinter.printText(`${CENTER}Driver Vehicle:${route?.params?.invData.PLATE_NO}`);
        // BLEPrinter.printBill(`${CENTER}Thank you\n`, { beep: false });

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



  const printHTML1 = async () => {
    console.log('signature', signature)
    await RNPrint.print({
      html: `<html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Display Form</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            height: 420px;
          }
          .container {
            margin: 0 auto;
            padding:10px
          }
          fieldset {
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 20px;
          }
          legend {
            font-weight: bold;
          }
          .form-field {
            margin-bottom: 10px;
          }
          table {
            font-family: arial, sans-serif;
            border-collapse: collapse;
            width: 100%;
          }
    
          td,
          th {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
            font-size:10px;
          }
          p{
            font-size:12px;
          }
        </style>
      </head>
      <body class="container">
        <div
          style="display: flex; flex-direction: column; align-items: space-between">
          <div>
            <div
              style="
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
              ">
              <div style="margin-right: 20px">
                <div>
                  <img
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAABaCAMAAADAfdLaAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAbZQTFRF////////xsbGrKysi4uLd3d3YmJia2trlZWVs7Oz7e3tdXV1SUlJJycnAgICLCwsUVFRh4eHw8PDtra219fXOzs7aGhofHx8CgoKMjIybW1tpKSkHBwcY2NjmJiY8vLynZ2dGRkZREREKysrXFxcGxsbQUFBPz8/eXl5o6OjzMzM5OTk/v7++fn5yMjIhoaGR0dHPDw8g4OD39/fW1tbFRUVWFhYFhYWjY2NKSkp29vbpqamTU1NVlZWqqqq09PTZGRkhISEn5+fsbGxiYmJRUVF8fHxb29vYWFhCwsLurq6ysrKS0tLLy8vvb29bGxsPT09ampqlJSUZmZmt7e3xcXF4+PjcnJympqaZ2dnVVVVcXFxX19fMTExtLS0goKCGBgYLi4ueHh4fn5+T09PqampJSUl0tLSXV1dAAAA4ODgPj4+u7u7DQ0NJCQkf39/p6enWVlZk5OTNjY2z8/PUFBQLS0taWlpjo6OoqKi3Nzce3t7ra2tkJCQr6+v9vb2paWlIyMjISEhHx8fQEBAc3NzQ0NDhYWF4uLi0dHRJiYmenp6wsLCj4+PdnZ2U1NTSkpKV1dXvwVBgQAAAJJ0Uk5T//7///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9ThbXCAAAYj0lEQVR4nO1dDZsjx1GeyJFP08CuViNpdvdWSkgkBZEAS/BKu5J2bQXJ0mIpGINjIMZ8BHMoCeCLIZgYSMAOIRC+/jFT1d3V1fM9Ix13R1zPY580O+qZ6ber6q3q6h7H+USedflU4V9UXvh09UUpD6o19wnc0ycSkkIgiRd+5md/7igkx/WTxpO6uycnXuVp30EByQ9S86QVxscA1X7ecPJPz86fG5zygvSwnoiQwulEPNEbPbD4p4FcdLrPxU3nAukznw0p0c9/DuTzIZx6zSd9t4cTr38qZeA/+wqV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"
                    style="width: 130px" />
                </div>
                <div>
                  <p style="margin-bottom: 0px; margin-top: 10px">
                    <strong
                      >Hock Seng Heng Transport &amp; Trading Pte Ltd.</strong
                    >
                  </p>
    
                  <p style="margin-top: 0px; margin-bottom: 0px">
                    <strong>9 Jalan Besut Singapore 619563</strong>
                  </p>
    
                  <p style="margin-top: 0px">
                    <strong>Tel: 6261-6101 Fax: 6261-1037</strong>
                  </p>
                </div>
              </div>
              <p>Delivery Order</p>
            </div>
    
            <div
              style="
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
              ">
              <div style="margin-right: 20px">
                <p style="margin-top: 0px; margin-bottom: 0px">
                  <strong>To: ${route?.params?.invData.NAME}</strong>
                </p>
                <p style="margin-top: 0px; margin-bottom: 0px">Site: ${route?.params?.invData.ADDRESS2}</p>
                <p style="margin-top: 0px">Sales Rep: ${route?.params?.invData.SALES_PERSON_NAME}</p>
              </div>
    
              <div>
              <p style="margin-top: 0px; margin-bottom: 0px"><strong>Do no: ${route?.params?.invData.INV_NO}</strong></p>
                <p style="margin-top: 0px; margin-bottom: 0px">
                  <strong>Date: ${new Date().toLocaleDateString()}</strong>
                </p>
    
                <p style="margin-top: 0px"><strong>Terms: COD</strong></p>
              </div>
            </div>
            <table>
              <tbody>
                <tr>
                  <th>ITEM</th>
                  <th width="400px">DESCRIPTION</th>
                  <th>QTY</th>
                  <th width="50px">UNIT(SGD)</th>
                  <th width="20px">AMOUNT(SGD)</th>
                </tr>
                <tr>
                  <td>1</td>
                  <td>${route?.params?.invData.DISPLAY_NAME}</td>
                  <td>${dieselValue}</td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="3" rowspan="4">
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        align-items: space-between;
                      ">
                      <p>Remarks:</p>
                      <p style="font-size: 12px">
                      ${remark == null ? '' : remark}
                      </p>
                    </div>
                  </td>
                  <td>ZERO-RATED</td>
                  <td></td>
                </tr>
                <tr>
                  <td>TAXABLE</td>
                  <td></td>
                </tr>
                <tr>
                  <td>9% GST</td>
                  <td></td>
                </tr>
                <tr>
                  <td>TOTAL</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            style="
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              margin-top: 30px;
            ">
            <div>
            ${signature == '' ? '' : ` <img src="${signature == null ? null : signature}" style="width: 130px"/>`}
           
            <p style="border-top: 2px solid black">
              Authorised Name, Signature &amp; Company Stamp
            </p>
            </div>
            <p >
              Driver Vehicle:${route?.params?.invData.PLATE_NO}
            </p>
          </div>
        </div>
      </body>
    </html>
    `
    })
  }

  const PostJobOrderDelivered = (dieselVal) => {
    setLoading(true);
    dieselValueCopy.current = dieselVal;
    DiesalQuantityGettingFromRouteParams.current = dieselVal
    // here you can calculate the price based on diesel value.
    // taxableAmount.current = 'something'
    // percentTax.current = 'something'
    // grandTotal.current = 'something'

    const userLog = getlogUser();
    const url = domain + "/PostJObOrderDelivered"
    const data = {
      "JobNumber": route?.params?.invData.INV_NO,
      "ProdId": 0,
      "PumpPrevious": 0,
      "PumpNow": 0,
      "Remark": remark,
      "QTY": dieselVal,
      "UpdatedBy": userLog,
      SIGNATURE64: signature,
      METER_BEFORE64: previewImageUribefore,
      METER_AFTER64: previewImageUri
    }
    // console.log(url, data);
    NetInfo.fetch().then(async networkState => {
      console.log("Is connected? - ", networkState.isConnected);
      if (networkState.isConnected) {
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        })
          .then(response => response.json())
          .then(result => {
            setLoading(false);
            // console.log("Job updated", result);
            setvisiblePint(true)
            // Alert.alert('Success', 'Job Successful', [
            //   {
            //     text: 'Print',
            //     onPress: () => printHTML()
            //   },
            //   { text: 'OK', onPress: () => navigation.replace('DeliveryOrder') },
            // ]);
            // setshowInput(false);
            // here we will get the fresh values of the job order
            JobDetailsAfterUpdate(route?.params?.invData.INV_NO)
          })
          .catch(error => {
            setLoading(false);
            console.log("Error:", error);
            Alert.alert("Job Failed");
          })
      }
      else {
        setLoading(false);
        var pending = await AsyncStorage.getItem('pendingDelivery');
        var pendingJ = JSON.parse(pending);
        if (pendingJ) {
          pendingJ.push({
            url: url,
            data: data
          });
          AsyncStorage.setItem('pendingDelivery', JSON.stringify(pendingJ));
          console.log('pending Data', pendingJ)

        }
        else {
          AsyncStorage.setItem('pendingDelivery', JSON.stringify([{
            url: url,
            data: data
          }]));

        }

        Alert.alert('Offline Mode', 'Data is saved locally. Will be uploaded when you are back online', [
          { text: 'OK', onPress: () => navigation.replace('DeliveryOrder') },
        ])
      }
    });

  }

  const openGallery = async (type, section) => {
    const options = {
      mediaType: 'image',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
    };
    try {
      var response;
      if (type) {
        response = await ImagePicker.launchImageLibrary(options);
      } else {
        response = await ImagePicker.launchCamera(options);
      }
      // console.log('response photos))))))))))))))))))>', response.assets);

      if (section === 'after') {
        setpreviewImageUri("data:" + response.assets[0].type + ";base64," + response.assets[0].base64);
        setimagePreview(true);
        onToggleMoreAf(80);
      } else {
        setpreviewImageUribefore("data:" + response.assets[0].type + ";base64," + response.assets[0].base64);
        setimagePreviewbefore(true);
        onToggleMoreBe(80);
      }
    } catch (error) {
      console.log(error);
    }
    setModalVisible(!modalVisible);
  };

  const onToggleMoreAf = height => {
    Animated.timing(heightMeterAfAnim, {
      toValue: height,
      duration: 500,
      useNativeDriver: false,
    }).start();
    setmoreMeterAf(!moreMeterAf);
  };

  const onToggleMoreBe = height => {
    Animated.timing(heightMeterBeAnim, {
      toValue: height,
      duration: 500,
      useNativeDriver: false,
    }).start();
    setmoreMeterBe(!moreMeterBe);
  };


  const getFiles = (uid) => {
    setLoading(true);
    var myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json');
    myHeaders.append("Content-Type", "application/json");
    var requestOptions = {
      method: 'GET',
      headers: myHeaders
    };
    console.log(`${domain}/GetJobFiles?_token=CDAC498B-116F-4346-AD72-C3F65A902FFD&_uid=${uid}`)
    fetch(
      `${domain}/GetJobFiles?_Token=CDAC498B-116F-4346-AD72-C3F65A902FFD&_uid=${uid}`,
      requestOptions,
    )
      .then(response => response.text())
      .then(result => {
        setLoading(false);
        try {
          var packet = JSON.parse(result);
          // console.log('Files', packet);
          if (packet.METER_AFTER64_String[0]) {
            setpreviewImageUri(packet.METER_AFTER64_String[0]);
            setimagePreview(true);
            onToggleMoreAf(80);
          }
          if (packet.METER_BEFORE64_String[0]) {
            setpreviewImageUribefore(packet.METER_BEFORE64_String[0]);
            setimagePreviewbefore(true);
            onToggleMoreBe(80);
          }
          if (packet.SIGNATURE64_String[0]) {
            // console.log(packet.SIGNATURE64_String[0])
            setsignature(packet.SIGNATURE64_String[0]);
            setsignatureURL("https://hsh.vellas.net:90/hshpump/signature/JOB_ORDER/" + uid + "/Signature.png");


          }



          // var temp = { ...res };
          // temp.PAC_PAGD_String = packet.PAC_PAGD_String;
          // setpacheck({ ...temp })
        }
        catch (e) {
          setLoading(false);
          console.log(e, 'Function error');
        }
      })
      .catch(error => {
        setLoading(false);
        console.log(error, 'Function error');
      });
  }

  const handleGetInputDiesel = (value) => { setDieselValue(value); }

  // useEffect(() => {
  //   console.log("These are the amounts we recieve: ----->",{
  //     "SUBTOTAL": route?.params?.invData.TAXABLE_AMT,
  //     "9%Tax": route?.params?.invData.VAT_AMT,
  //     "Total": route?.params?.invData.TOTAL_PAYABLE,
  //   })
  // }, [])

  // useEffect(() => {
  //   console.log('This is PO_NO ++++++>', typeof (route?.params?.invData?.PO_NO));
  // }, [])

  useEffect(() => {
    getFiles(route?.params?.invData.UID);
    setDieselValue(route?.params?.invData.qty_order);
    dieselValueCopy.current = route?.params?.invData.qty_order;
    signatureURLCopy.current = "https://hsh.vellas.net:90/hshpump/signature/JOB_ORDER/" + route?.params?.invData.UID + "/Signature.png";
    console.log(signatureURLCopy.current)
    setRemark(route?.params?.invData.REMARK);
    editable ?
      setshowInput(true) : setshowInput(false);
  }, []);
  if (signatureVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <Text style={{ fontSize: 20, color: '#01315C', fontWeight: 'bold', margin: 10, textDecorationLine: 'underline' }}>
          Sign here..
        </Text>
        <SignatureCapture
          style={{ flex: 1 }}
          ref={sign}
          onSaveEvent={_onSaveEvent}
          showNativeButtons={false}
          showTitleLabel={false}
          viewMode={'landscape'}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', bottom: 10 }}>
          <Button mode="contained" onPress={() => saveSign()} buttonColor='#01315C' textColor='white'>
            Save
          </Button>
          <Button mode="contained" onPress={() => resetSign()} buttonColor='#01315C' textColor='white'>
            Reset
          </Button>
        </View>
      </View>
    )
  }
  return (
    <Provider>
      <Portal>
        <Modal visible={loading}>
          <ActivityIndicator animating={true} color={MD2Colors.red800} size='large' />
        </Modal>
      </Portal>
      <Animated.View
        style={{ flexDirection: 'row', flex: 1, backgroundColor: 'white' }}>
        {/* <SideBar all={true} navigation={navigation} /> */}
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ justifyContent: 'space-between', flexDirection: 'row', width: editable ? '55%' : '100%' }}>
            <TouchableOpacity
              onPress={() => {
                navigation.replace('DeliveryOrder');
              }}>
              <Icon
                name="chevron-left"
                color="#01315C"
                size={30}
                style={{ marginBottom: 10 }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#01315C', flexDirection: 'row', padding: 5, paddingHorizontal: 10, justifyContent: "center", alignItems: 'center', gap: 5, borderRadius: 8 }}
              onPress={() => {
                printHTML()
                // Alert.alert('Success', 'Job Successful', [
                //   {
                //     text: 'Print',
                //     onPress: () => printHTML()
                //   },
                //   { text: 'OK', onPress: () => navigation.replace('DeliveryOrder') },
                // ]);

              }}>
              <Text style={{ color: 'white' }}>Print</Text>
              <Icon
                name="print"
                color="#fff"
                size={20}
              />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ width: editable ? '55%' : '100%' }}>
            <View>
              <Text
                style={{
                  fontSize: width / 40,
                  color: '#01315C',
                  marginBottom: 10,
                }}>
                {route?.params?.invData.INV_NO}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}>
              <Text
                style={{ fontSize: width / 40, color: '#01315C', marginRight: 40 }}>
                {route?.params?.invData.NAME}
              </Text>
            </View>
            <Animated.View style={{ marginBottom: 10 }}>
              {route?.params?.invData.PRINT_ADDRESS && <Text style={{ fontSize: width / 40, color: '#01315C' }}>
                {route?.params?.invData.PRINT_ADDRESS}
              </Text>
              }
              {route?.params?.invData.ADDRESS2 &&
                <Text style={{ fontSize: width / 40, color: '#01315C', marginBottom: 10 }}>
                  {route?.params?.invData.ADDRESS2}
                </Text>
              }
            </Animated.View>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: '#01315C',
                marginBottom: 20,
              }}></View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <View>
                <Text style={{ fontSize: 25, color: '#01315C', marginRight: 40 }}>
                  {t('Product')}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: width / 45,
                color: '#01315C',
                fontWeight: 600,
                marginBottom: 20,
              }}>
              {route?.params?.invData.DISPLAY_NAME}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <View>
                <Text style={{ fontSize: 25, color: '#01315C', marginRight: 40 }}>
                  {t('litres_of_diesel_sold')}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: width / 45,
                color: '#01315C',
                fontWeight: 600,
                marginBottom: 20,
              }}>
              {dieselValue}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Text
                style={{ fontSize: width / 45, color: '#01315C', marginRight: 40 }}>
                {t('signature')}
              </Text>
              {/* <Icon disabled={!editable} name="edit" color="#01315C" size={20} onPress={showSignatureModal} /> */}
              <TouchableOpacity disabled={!editable} onPress={showSignatureModal} style={{ backgroundColor: '#01315C', padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white', width: 50, textAlign: 'center' }}>Sign</Text>
              </TouchableOpacity>
            </View>
            {/* <Text
            style={{
              fontSize: width / 40,
              color: '#3DB792',
              marginBottom: 20,
            }}>
            Uploaded
          </Text> */}
            {signature == "" ? null : (
              <Image
                style={{ height: 80, flex: 1, borderWidth: 1, borderColor: 'black', marginBottom: 10 }}
                source={{ uri: signature }}
                resizeMode="contain"
              />
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
              }}>
              <View>
                <Text style={{ fontSize: 20, color: '#01315C', marginRight: 40 }}>
                  {t('metre_reading_after')}
                </Text>
              </View>

              {/* <Icon disabled={!editable}
                onPress={() => {
                  setuploadtype('after');
                  setModalVisible(true);
                }}
                name="edit"
                color="#01315C"
                size={20}
              /> */}
              <TouchableOpacity disabled={!editable} onPress={() => {
                setuploadtype('after');
                setModalVisible(true);
              }} style={{ backgroundColor: '#01315C', padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white', width: 50, textAlign: 'center' }}>Upload</Text>
              </TouchableOpacity>
            </View>
            <Animated.View
              style={{
                height: heightMeterAfAnim,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              }}>
              {previewImageUri.length == 0 ? null : (
                <Image
                  style={{ height: '100%', flex: 1 }}
                  source={{ uri: previewImageUri }}
                  resizeMode="contain"
                />
              )}
            </Animated.View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
                marginBottom: 20
              }}>
              <View>
                <Text style={{ fontSize: 20, color: '#01315C', marginRight: 40 }}>
                  {t('metre_reading_before')}
                </Text>
              </View>
              {/* <Icon disabled={!editable}
                onPress={() => {
                  setuploadtype('before');
                  setModalVisible(true);
                }}
                name="edit"
                color="#01315C"
                size={20}
              /> */}
              <TouchableOpacity disabled={!editable} onPress={() => {
                setuploadtype('before');
                setModalVisible(true);
              }} style={{ backgroundColor: '#01315C', padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white', width: 50, textAlign: 'center' }}>Upload</Text>
              </TouchableOpacity>
            </View>
            <Animated.View
              style={{
                height: heightMeterBeAnim,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              }}>
              {previewImageUribefore.length == 0 ? null : (
                <Image
                  style={{ height: '100%', flex: 1 }}
                  source={{ uri: previewImageUribefore }}
                  resizeMode="contain"
                />
              )}
            </Animated.View>
            <Text
              style={{
                fontSize: 20,
                color: '#01315C',
                marginRight: 40,
              }}>
              {t('remarks')}
            </Text>
            <KeyboardAvoidingView
              style={{ marginBottom: 50 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TextInput editable={editable} style={[remarks]} multiline={true} numberOfLines={4} value={remark} onChangeText={text => setRemark(text)} />
            </KeyboardAvoidingView>
          </ScrollView>
        </View>
        <RightInputBar
          header="Liters of Diesel Sold"
          subHeader="Enter quantity of diesel sold"
          show={showInput}
          defaultValue={false}
          keepinView={true}
          getInputDiesel={handleGetInputDiesel}
          hide={() => setshowInput(false)}
          initialValue={dieselValue}
          onSubmit={(dieselVal) => {
            PostJobOrderDelivered(dieselVal)
          }}
        />
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            Alert.alert('Modal has been closed.');
            setModalVisible(!modalVisible);
          }}>
          <View style={styles.centeredView}>
            <View style={[styles.modalView]}>
              <View style={{ flexDirection: 'row' }}>
                <View
                  style={{
                    width: '80%',
                    height: 50,
                    backgroundColor: '#d3d3d370',
                  }}>
                  <Text
                    style={[
                      {
                        fontSize: 22,
                        color: '#000',
                        fontWeight: '600',
                        paddingLeft: 10,
                        paddingVertical: 8,
                      },
                    ]}>
                    {t('Metre Reading After')}
                  </Text>
                </View>
                <View
                  style={{
                    width: '20%',
                    height: 50,
                    backgroundColor: '#d3d3d370',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(!modalVisible)}
                    style={{
                      width: 50,
                      height: 50,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Text
                      style={[
                        {
                          fontSize: 22,
                          color: '#000',
                          paddingLeft: 20,
                          fontWeight: '600',
                        },
                      ]}>
                      <Icon name="close" color="#000" size={20} />
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View
                style={{ flexDirection: 'row', paddingTop: 20, paddingLeft: 20 }}>
                <TouchableOpacity
                  style={{
                    width: 80,
                    height: 80,
                    borderWidth: 2,
                    borderColor: 'navy',
                    marginRight: 50,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    openGallery(true, uploadtype);
                  }}>
                  <Icon name="image" color="navy" size={20} />
                  <Text style={{ color: 'navy' }}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 80,
                    height: 80,
                    borderWidth: 2,
                    borderColor: 'navy',
                    marginRight: 10,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    openGallery(false, uploadtype);
                  }}>
                  <Icon name="camera" color="navy" size={20} />
                  <Text style={{ color: 'navy' }}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <DialogComp visible={printModal} onClose={(val) => setprintModal(false)}>
          {
            printers.map((printer, index) => (
              <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, width: '100%' }} key={printer.inner_mac_address} onPress={() => _connectPrinter(printer)}>
                <Text style={{ color: 'black', fontSize: 15, textAlign: 'center' }}>{`${printer.device_name}(${printer.inner_mac_address})`}</Text>
              </TouchableOpacity>
            ))
          }
        </DialogComp>
        <AwesomeAlert
          show={visiblePint}
          showProgress={false}
          title="Job Successful"
          message="Do you want to print this job?"
          closeOnTouchOutside={false}
          closeOnHardwareBackPress={false}
          showCancelButton={true}
          showConfirmButton={true}
          cancelText="No"
          confirmText="Print"
          confirmButtonColor="#01315C"
          cancelButtonTextStyle={{ color: 'black', fontSize: 15 }}
          confirmButtonTextStyle={{ fontSize: 20 }}
          confirmButtonStyle={{ marginLeft: 30 }}
          titleStyle={{ color: 'black' }}
          messageStyle={{ color: 'black' }}
          onCancelPressed={() => {
            // this.hideAlert();
            setvisiblePint(false);
            navigation.replace('DeliveryOrder');
          }}
          onConfirmPressed={() => {
            // this.hideAlert();
            setvisiblePint(false);
            setTimeout(() => {
              printHTML();
            }, 500)

          }}
        />
      </Animated.View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    width: 400,
    height: 200,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalText: {
    marginBottom: 15,
    color: '#000',
  },
});
