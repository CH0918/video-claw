import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export function VerificationCode({
  appName = 'our app',
  logoUrl,
  code,
}: {
  appName?: string;
  logoUrl?: string;
  code: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`${code} is your verification code for ${appName}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {logoUrl && (
            <Section style={styles.logoWrap}>
              <Img
                src={logoUrl}
                width="36"
                height="36"
                alt={appName}
                style={styles.logo}
              />
            </Section>
          )}

          <Text style={styles.title}>Verify your email</Text>

          <Text style={styles.p}>
            Your verification code is:
          </Text>

          <Section style={styles.codeWrap}>
            <Text style={styles.code}>{code}</Text>
          </Section>

          <Text style={styles.p}>
            Enter this code to complete your sign up for{' '}
            <strong>{appName}</strong>. The code expires in 5 minutes.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            If you didn&apos;t request this, just ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    color: '#1a1a1a',
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '40px 24px',
  },
  logoWrap: {
    marginBottom: 24,
  },
  logo: {
    borderRadius: 8,
  },
  title: {
    margin: '0 0 16px',
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a1a',
  },
  p: {
    margin: '0 0 16px',
    fontSize: 14,
    lineHeight: '22px',
    color: '#4b5563',
  },
  codeWrap: {
    textAlign: 'center',
    margin: '24px 0',
  },
  code: {
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: '0.25em',
    color: '#111827',
    margin: 0,
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  footer: {
    margin: 0,
    fontSize: 12,
    lineHeight: '18px',
    color: '#9ca3af',
  },
};
