
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await login(phone, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Local Market</Text>
      <TextInput style={s.input} placeholder="Phone (03XXXXXXXXX)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Login</Text>}
      </Pressable>
  <Link href={'/register' as Href} style={s.link}>Naya account banayein</Link>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  btn: { backgroundColor: '#0f766e', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#b91c1c' },
  link: { textAlign: 'center', color: '#0f766e', marginTop: 8 },
});