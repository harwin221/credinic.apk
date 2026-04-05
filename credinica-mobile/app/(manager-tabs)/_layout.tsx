import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function ManagerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
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
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cash-multiple" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="file-document-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="disbursements"
        options={{
          title: 'Desembolsos',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cash-check" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="magnify" size={24} color={color} />,
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

