import { Tabs } from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9', // Azul principal de CrediNic
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          color: '#0ea5e9',
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recaudado',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clock-time-three-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: 'Créditos',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="wallet-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Mis Clientes',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-details-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

