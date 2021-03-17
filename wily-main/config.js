import { firebase } from '@firebase/app';
import '@firebase/firestore'

var firebaseConfig = {
  apiKey: "AIzaSyD5a4VwWVNJArBUK3Xy13J1KwrmkD78tQ0",
  authDomain: "wily-342cf.firebaseapp.com",
  projectId: "wily-342cf",
  storageBucket: "wily-342cf.appspot.com",
  messagingSenderId: "179805388124",
  appId: "1:179805388124:web:99c0ad20b3d06856db9599"
};

if(!firebase.apps.length)
{
firebase.initializeApp(firebaseConfig);
}
export default firebase.firestore();