import dynamic from 'next/dynamic';
const Login = dynamic(() => import('../src/Login'), { ssr: false });
export default function LoginPage(props: any) {
  return <Login {...props} />;
}
