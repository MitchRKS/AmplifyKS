import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

export interface AuthFormHandle {
  /**
   * Submit the form. On web this goes through the real <form> element
   * (requestSubmit fires a genuine submit event, which is what makes
   * Safari/Chrome offer to save the credentials); on native it calls
   * onSubmit directly.
   */
  submit: () => void;
}

interface AuthFormProps {
  onSubmit: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Credential-aware form wrapper for the auth screens.
 *
 * Browser password managers (iCloud Keychain, Chrome, 1Password, …) only
 * reliably offer to fill or save credentials when the inputs live inside a
 * real <form> that actually fires a submit event — react-native-web renders
 * bare <input>s with no form, which is why autofill worked on iOS but not in
 * the browser. On web this renders a genuine <form> (with a hidden submit
 * button so Enter performs implicit submission); on native it's just a View.
 */
export const AuthForm = forwardRef<AuthFormHandle, AuthFormProps>(
  function AuthForm({ onSubmit, children, style }, ref) {
    const formRef = useRef<HTMLFormElement>(null);

    useImperativeHandle(ref, () => ({
      submit: () => {
        if (Platform.OS === 'web' && formRef.current) {
          if (typeof formRef.current.requestSubmit === 'function') {
            formRef.current.requestSubmit();
          } else {
            // Very old browsers without requestSubmit: skip the form event.
            onSubmit();
          }
        } else {
          onSubmit();
        }
      },
    }));

    if (Platform.OS !== 'web') {
      return <View style={style}>{children}</View>;
    }

    return (
      <form
        ref={formRef}
        method="post"
        onSubmit={(event) => {
          // The submit event is what password managers listen for; the actual
          // sign-in stays client-side.
          event.preventDefault();
          onSubmit();
        }}
      >
        <View style={style}>{children}</View>
        <button type="submit" aria-hidden tabIndex={-1} style={hiddenSubmitStyle} />
      </form>
    );
  },
);

// display:none would make some browsers skip implicit form submission on
// Enter; visually-hidden keeps the submit button functional but invisible.
const hiddenSubmitStyle = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  border: 0,
  clip: 'rect(0 0 0 0)',
  overflow: 'hidden' as const,
};
