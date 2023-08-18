import {
  StyleSheet,
  Text,
  View,
  Modal,
  Animated,
  Dimensions,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  remarks,
} from './styles/MainStyle';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import SideBar from './ui/SideBar';
import RightInputBar from './ui/RightInputBar';
import { getVehicle } from './functions/helper';

const { width } = Dimensions.get('window');
export default function DeliveryOrder({ navigation, route }) {
  const { t } = useTranslation();
  const [showInput, setshowInput] = useState(!true);
  const heightMeterAfAnim = useRef(new Animated.Value(0)).current;
  const heightMeterBeAnim = useRef(new Animated.Value(0)).current;
  const [uploadtype, setuploadtype] = useState('after');
  const [moreMeterAf, setmoreMeterAf] = useState(false);
  const [moreMeterBe, setmoreMeterBe] = useState(false);
  const [remark, setRemark] = useState('')

  const [modalVisible, setModalVisible] = useState(false);
  //after
  const [previewImageUri, setpreviewImageUri] = useState('');
  const [imagePreview, setimagePreview] = useState(false);
  //before
  const [previewImageUribefore, setpreviewImageUribefore] = useState('');
  const [imagePreviewbefore, setimagePreviewbefore] = useState(false);
  const [dieselValue, setDieselValue] = useState(0)

  const PostJobOrderDelivered = () => {
    const url = "https://demo.vellas.net:94/pump/api/Values/PostJObOrderDelivered"
    const data = {
      "JobNumber": route?.params?.invData.INV_NO,
      "ProdId": route?.params?.invData.PO_NO ? route.params.invData.PO_NO : 0,
      "PumpPrevious": route?.params?.invData.qty_order,
      "PumpNow": dieselValue,
      "Remark": remark,
      "QTY": route?.params?.invData.qty_order,
      "UpdatedBy": route?.params?.invData.DRIVER_NAME ? route.params.invData.DRIVER_NAME : 'admin'
    }
    console.log(data);
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(result => {
        console.log(result);
        Alert.alert('Success')
        setshowInput(false);
      })
      .catch(error => {
        console.log("Error:", error);
        Alert.alert("Job Failed");
      })
  }

  const openGallery = async (type, section) => {
    const options = {
      mediaType: 'image',
      includeBase64: false,
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
      console.log('resp', response);

      if (section === 'after') {
        setpreviewImageUri(response.assets[0].uri);
        setimagePreview(true);
        onToggleMoreAf(80);
      } else {
        setpreviewImageUribefore(response.assets[0].uri);
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

  const handleGetInputDiesel = (value) => setDieselValue(value)

  useEffect(() => {
    setDieselValue(route?.params?.invData.qty_order)
    setshowInput(true);
  }, []);

  return (
    <Animated.View
      style={{ flexDirection: 'row', flex: 1, backgroundColor: 'white' }}>
      <SideBar all={true} navigation={navigation} />
      <View style={{ flex: 1, padding: 20 }}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('DeliveryOrder');
          }}>
          <Icon
            name="chevron-left"
            color="#01315C"
            size={30}
            style={{ marginBottom: 10 }}
          />
        </TouchableOpacity>
        <ScrollView style={{ width: '55%' }}>
          <View>
            <Text
              style={{
                fontSize: width / 40,
                color: '#01315C',
                fontWeight: 600,
                marginBottom: 5,
              }}>
              {route?.params?.invData.DRIVER_NAME}
            </Text>
            <Text
              style={{
                fontSize: width / 60,
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
              style={{ fontSize: width / 60, color: '#01315C', marginRight: 40 }}>
              {route?.params?.invData.NAME}
            </Text>
          </View>
          <Animated.View style={{ height: 150, marginBottom: 10 }}>
            <Text style={{ fontSize: 18, color: '#01315C' }}>
              {route?.params?.invData.PRINT_ADDRESS}
            </Text>
            <Text style={{ fontSize: 18, color: '#01315C', marginVertical: 10 }}>
              {route?.params?.invData.ADDRESS2}
            </Text>
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
            <Icon name="edit" color="#01315C" size={20} />
          </View>
          <Text
            style={{
              fontSize: width / 60,
              color: '#3DB792',
              marginBottom: 20,
            }}>
            Uploaded
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
            <View>
              <Text style={{ fontSize: 20, color: '#01315C', marginRight: 40 }}>
                {t('metre_reading_after')}
              </Text>
            </View>

            <Icon
              onPress={() => {
                setuploadtype('after');
                setModalVisible(true);
              }}
              name="edit"
              color="#01315C"
              size={20}
            />
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
              marginBottom: 20,
            }}>
            <View>
              <Text style={{ fontSize: 20, color: '#01315C', marginRight: 40 }}>
                {t('metre_reading_before')}
              </Text>
            </View>
            <Icon
              onPress={() => {
                setuploadtype('before');
                setModalVisible(true);
              }}
              name="edit"
              color="#01315C"
              size={20}
            />
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
              backgroundColor: '#EEF7FF',
            }}>
            {t('remarks')}
          </Text>
          <KeyboardAvoidingView
            style={{ marginBottom: 50 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TextInput style={[remarks]} multiline={true} numberOfLines={4} value={remark} onChangeText={text => setRemark(text)} />
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
        initialValue={route?.params?.invData.qty_order}
        onSubmit={() => {
          PostJobOrderDelivered()
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
    </Animated.View>
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
