import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ToastAndroid
} from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import firebase from 'firebase/app';
import db from '../config';

export default class TransactionScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      hasCameraPermissions: null,
      scanned: false,
      scannedBookId: '',
      scannedStudentId: '',
      buttonState: 'normal',
      transactionMessage: '',
    };
  }

  getCameraPermissions = async (id) => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" is true when user has granted permission
        status === "granted" is false when user has not granted the permission
      */
      hasCameraPermissions: status === 'granted',
      buttonState: id,
      scanned: false,
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { buttonState } = this.state;

    if (buttonState === 'BookId') {
      this.setState({
        scanned: true,
        scannedBookId: data,
        buttonState: 'normal',
      });
    } else if (buttonState === 'StudentId') {
      this.setState({
        scanned: true,
        scannedStudentId: data,
        buttonState: 'normal',
      });
    }
  };

  initiateBookIssue = async () => {
    //add a transaction
    await db
      .collection('transactions')
      .add({
        studentId: this.state.scannedStudentId,
        bookId: this.state.scannedBookId,
        data: firebase.firestore.Timestamp.now().toDate(),
        transactionType: 'Issue',
      })
      .then(function (docRef) {
        console.log('Document written with ID: ', docRef.id);
      })
      .catch(function (error) {
        console.error('Error adding document: ', error);
      });

    //change book status
    await db.collection('books').doc(this.state.scannedBookId).update({
      bookAvailability: false,
    });
    //change number of issued books for student
    await db
      .collection('students')
      .doc(this.state.scannedStudentId)
      .update({
        numberOfBooksIssued: firebase.firestore.FieldValue.increment(1),
      });

    this.setState({
      scannedStudentId: '',
      scannedBookId: '',
    });
   
  };

  initiateBookReturn = async () => {
    //add a transaction
    await db.collection('transactions').add({
      studentId: this.state.scannedStudentId,
      bookId: this.state.scannedBookId,
      date: firebase.firestore.Timestamp.now().toDate(),
      transactionType: 'Return',
    });

    //change book status
    await db.collection('books').doc(this.state.scannedBookId).update({
      bookAvailability: true,
    });

    //change book status
    await db
      .collection('students')
      .doc(this.state.scannedStudentId)
      .update({
        numberOfBooksIssued: firebase.firestore.FieldValue.increment(-1),
      });

    this.setState({
      scannedStudentId: '',
      scannedBookId: '',
    });
    
  };
  /* Start Class 73 */
  checkStudentEligibilityForBookIssue=async()=>{
    const studentRef = db.collection("students").where("studentId", "==" , this.state.scannedStudentId).get();
    var isStudentEligible = '';
    if(studentRef.docs.length===0){
      //Alert.alert("Student ID doesn't exist in the database...");
      ToastAndroid.show("Student ID doesn't exist in the database...", ToastAndroid.SHORT);
      this.setState({
        scannedBookId: "",
        scannedStudentId: ""
      })
      isStudentEligible = false;
    }else{
      studentRef.docs.map((doc)=>{
        var student = doc.data();
        if(student.numberOfBooksIssued < 2){
          isStudentEligible = true;
        }else{
          //Alert.alert("Book issue limit of 2 books reached...");
          ToastAndroid.show("Book issue limit of 2 books reached...", ToastAndroid.SHORT);
          this.setState({
            scannedBookId: "",
            scannedStudentId: ""
          })
          isStudentEligible = false;
        }
      })
    }
    return isStudentEligible;
  }

  checkStudentEligibilityForBookReturn = async()=>{
    const transactionRef=db.collection("transactions").where("bookId", '==', this.state.scannedBookId).limit(1).get();

    var isStudentEligible = "";
    transactionRef.docs.map((doc)=>{
      var lastBookTransaction=doc.data();
      if(lastBookTransaction.studentId === this.state.scannedStudentId){
        isStudentEligible = true;
      }else{
        //Alert.alert("This book wasn't issued to this student...");
        ToastAndroid.show("This book wasn't issued to this student..", ToastAndroid.SHORT);
        this.setState({
          scannedBookId: "",
          scannedStudentId: ""
        })
        isStudentEligible = false;
      }
    });
    return isStudentEligible;
  }

  checkBookEligibility= async()=>{
    const bookRef=await db.collection("books").where("bookId", "==", this.state.scannedBookId).get();
    var transactionType = "";
    if(bookRef.docs.length == 0 ){
      transactionType = false;
      console.log("no matching books found");
    }
    else{
      bookRef.docs.map((doc)=>{
        var book = doc.data();
        if(book.bookAvailability){
          transactionType = "Issue";
        }else{
          transactionType = "Return";
        }
      })
    }
    return transactionType;
  }

  /* End Class 73 */
  handleTransactions = async () => {
    /* Start Class 73 */
    var transactionType = await this.checkBookEligibility();
    console.log("type:" + transactionType);
    if(!transactionType){
      console.log("Book doesn't exist in the database");
      //Alert.alert("Book doesn't exist in the database");
      ToastAndroid.show("Book doesn't exist in the database", ToastAndroid.SHORT);
      this.setState({
        scannedBookId: "",
        scannedStudentId: ""
      })
    }else if(transactionType === "Issue"){
      var isStudentEligible = await this.checkStudentEligibilityForBookIssue();
      if(isStudentEligible){
        this.initiateBookIssue();
        console.log("Book Issued to the student")
        transactionMessage = 'Book Issued to the student';
        ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
      }
    }else{
      var isStudentEligible = await this.checkStudentEligibilityForBookReturn();
      if(isStudentEligible){
        console.log("Book Returned to the library")
        this.initiateBookReturn();
        transactionMessage = 'Book Returned to the library';
        ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
      }
      /* End Class 73 */
    }
    /* Class 69-72
    var transactionMessage = null;
    await db
      .collection('books')
      .doc(this.state.scannedBookId)
      .get()
      .then((doc) => {
        var book = doc.data();
        if (book.bookAvailability) {
          this.initiateBookIssue();
          transactionMessage = 'Book Issued';
          ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
        } else {
          this.initiateBookReturn();
          transactionMessage = 'Book Returned';
          ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
        }
      })
      .catch(function (error) {
        console.log('Error getting document:', error);
        Alert.alert('err');
      });

    this.setState({
      transactionMessage: transactionMessage,
    });
    Alert.alert(this.state.transactionMessage);
    */
  };

  render() {
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;

    if (buttonState !== 'normal' && hasCameraPermissions) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    } else if (buttonState === 'normal') {
      return (
        <KeyboardAvoidingView style={styles.container} behavior="padding" enabled>
          <View>
            <Image
              source={require('../assets/booklogo.jpg')}
              style={{ width: 200, height: 200 }}
            />
            <Text style={{ textAlign: 'center', fontSize: 30 }}>Wily</Text>
          </View>
          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder="Book Id"
              value={this.state.scannedBookId}
              onChangeText={text=>this.setState({scannedBookId: text})}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                this.getCameraPermissions('BookId');
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder="Student Id"
              value={this.state.scannedStudentId}
              onChangeText={text=>this.setState({scannedStudentId: text})}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                this.getCameraPermissions('StudentId');
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.transactionAlert}>
            {this.state.transactionMessage}
          </Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={async () => {
              var transactionMessage = await this.handleTransactions();
            }}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // displayText: {
  //   fontSize: 15,
  //   textDecorationLine: 'underline',
  // },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  inputView: {
    flexDirection: 'row',
    margin: 20,
  },
  inputBox: {
    width: 200,
    height: 40,
    borderWidth: 1.5,
    borderRightWidth: 0,
    fontSize: 20,
  },
  scanButton: {
    backgroundColor: '#66BB6A',
    width: 50,
    borderWidth: 1.5,
    borderLeftWidth: 0,
  },
  submitButton: {
    backgroundColor: '#FBC02D',
    width: 100,
    height: 50,
  },
  submitButtonText: {
    padding: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
});
