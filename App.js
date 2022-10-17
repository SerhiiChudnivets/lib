import * as React from 'react';
import { Button, Text, TextInput, View  } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import axios from 'axios';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import {BarCodeScanner} from "expo-barcode-scanner";
import {useEffect, useState} from "react";

async function save(key, value) {
    await SecureStore.setItemAsync(key, value);
}
const fetchUser = async (data) => {
    const configurationObject = {
        method: 'post',
        url: `https://radiant-basin-15707.herokuapp.com/api/auth/local`,
        data: {'identifier':data.username, 'password': data.password }
    };
    console.log(data);
    const response = await axios(configurationObject);
    console.log('jwt = ', response);
    await save('userToken', response.data.jwt);
    console.log(response.data);
};
async function getValueFor(key) {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
        return result;
    } else {
        alert('No values stored under that key.');
    }
}
const AuthContext = React.createContext();

function SplashScreen() {
    return (
        <View>
            <Text>Loading...</Text>
        </View>
    );
}
function MainScreen({navigation}){
    return (
        <View>
            <Button
                onPress={() => navigation.navigate('Home')}
                title="Go to Homescreen"
            />
        </View>
    )
}
 function HomeScreen({navigation}) {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [text, setText] = useState('Not yet scanned');
    const askForCammeraPermission = () =>{
        (async () => {
            const { status } = await  BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status == 'granted');
        })()
    }
    useEffect(()=>{
        askForCammeraPermission();
    },[])
     const handleBarCodeScanned = ({type, data, }) =>{
        setScanned(true);
        setText(data);
        console.log('Type: ' + type + '\nData: '+ data );
     }
     if(hasPermission === null){
         return (
             <View>
                 <Text>Requesting for camera permission</Text>
                 <Button title={"Allow camera"} onPress={()=>askForCammeraPermission()}/>
             </View>
         )
     }
     if (hasPermission === false ){
         return (
             <View>
                 <Text style={{margin: 10}}>No access to camera</Text>
                 <Button title={"Allow camera"} onPress={()=>askForCammeraPermission()}/>
             </View>
         )
     }


    const { signOut, getBooks } = React.useContext(AuthContext);
     getBooks();
         return (
             <View>
                 <Text>Signed in!</Text>
                 <Button title="Sign out" onPress={signOut}/>
                 <View style={{
                     alignItems: 'center',
                     justifyContent: "center",
                     height: 400,
                     width: 400,
                     overflow: "hidden",
                     backgroundColor: "tomato"
                 }}>
                     <BarCodeScanner onBarCodeScanned={scanned ? false : handleBarCodeScanned}
                                     style={{height: '100%', width: "100%"}}/>
                 </View>
                 <Text >{text}</Text>
                 <Button title={'Scan again?'} onPress={() => setScanned(false)} color='tomato'/>
             </View>

         );
}
function  BookScreen() {
    return (
        <View>
            <Text>Book</Text>
        </View>
    );
}
function SignInScreen() {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');

    const { signIn} = React.useContext(AuthContext);

    return (
        <View>
            <TextInput
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
            />
            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title="Sign in" onPress={() => signIn({ username, password })} />
        </View>
    );
}

const Stack = createStackNavigator();

export default function App({ navigation }) {
    const [state, dispatch] = React.useReducer(
        (prevState, action) => {
            switch (action.type) {
                case 'RESTORE_TOKEN':
                    return {
                        ...prevState,
                        userToken: action.token,
                        isLoading: false,
                    };
                case 'SIGN_IN':
                    return {
                        ...prevState,
                        isSignout: false,
                        userToken: action.token,
                    };
                case 'SIGN_OUT':
                    return {
                        ...prevState,
                        isSignout: true,
                        userToken: null,
                    };
            }
        },
        {
            isLoading: true,
            isSignout: false,
            userToken: null,
        }
    );

    React.useEffect(() => {
        // Fetch the token from storage then navigate to our appropriate place
        const bootstrapAsync = async () => {
            let userToken;

            try {
                // Restore token stored in `SecureStore` or any other encrypted storage
                userToken = await SecureStore.getItemAsync('userToken');
            } catch (e) {
                // Restoring token failed
            }

            // After restoring token, we may need to validate it in production apps

            // This will switch to the App screen or Auth screen and this loading
            // screen will be unmounted and thrown away.
            dispatch({ type: 'RESTORE_TOKEN', token: userToken });
        };

        bootstrapAsync();
    }, []);

    const authContext = React.useMemo(
        () => ({
            signIn: async (data) => {
                // In a production app, we need to send some data (usually username, password) to server and get a token
                // We will also need to handle errors if sign in failed
                // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
                // In the example, we'll use a dummy token
                await fetchUser(data);
                dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
            },
            signOut: () => dispatch({ type: 'SIGN_OUT' }),
            signUp: async (data) => {


                // In a production app, we need to send user data to server and get a token
                // We will also need to handle errors if sign up failed
                // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
                // In the example, we'll use a dummy token

                dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
            },
            getBooks: async ()=>{
                const token = await getValueFor('userToken');
                const books  = await axios.get('https://radiant-basin-15707.herokuapp.com/api/books', {headers:{'Authorization':`Bearer ${token}`}});
                return books.data;
            }
        }),
        []
    );
    return (
        <AuthContext.Provider value={authContext}>
            <NavigationContainer>
                <Stack.Navigator>
                    {state.isLoading ? (
                        // We haven't finished checking for the token yet
                        <Stack.Screen name="Splash" component={SplashScreen} />
                    ) : state.userToken == null ? (
                        // No token found, user isn't signed in
                        <Stack.Screen
                            name="SignIn"
                            component={SignInScreen}
                            options={{
                                title: 'Sign in',
                                // When logging out, a pop animation feels intuitive
                                animationTypeForReplace: state.isSignout ? 'pop' : 'push',
                            }}
                        />
                    ) : (
                        // User is signed in
<Stack.Group>
                        <Stack.Screen name="Main" component={MainScreen} />
                        <Stack.Screen name="Home" component={HomeScreen}  />
                        <Stack.Screen name="Book" component={BookScreen}  />

</Stack.Group>
                        )}
                </Stack.Navigator>
            </NavigationContainer>
        </AuthContext.Provider>
    );
}
