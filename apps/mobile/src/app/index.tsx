import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, logout } = useAuth();
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Salam, {user?.name}</Text>
      <Text>Role: {user?.role}</Text>
      <Text>Phone: {user?.phone}</Text>
      <Pressable style={s.btn} onPress={logout}>
        <Text style={s.btnText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  btn: { backgroundColor: '#0f766e', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '600' },
});