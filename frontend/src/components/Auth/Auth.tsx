/* на русской раскладке ctrl + ? будет окно вызова импортов */
/* комментарии / + ** и будут многострочные комментарии */
import { useMutation } from '@apollo/client';
import { Button, Center, Image, Input, Stack, Text } from '@chakra-ui/react';
import { Session } from 'next-auth';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import UserOperations from '../../graphql/operations/user';
import { CreateUsernameData, CreateUsernameVariables } from '../../util/types';

interface IAuthProps {
  session: Session | null;
  reloadSession: () => void;
}

const Auth: React.FC<IAuthProps> = ({ session, reloadSession }) => {
  const [username, setUsername] = useState('');
  const [createUsername, { loading, error }] = useMutation<
    CreateUsernameData,
    CreateUsernameVariables
  >(UserOperations.Mutations.createUsername);

  const onSubmit = async () => {
    if (!username) return;
    try {
      const { data } = await createUsername({ variables: { username } });
      if (!data?.createUsername) {
        throw new Error();
      }
      if (data.createUsername.error) {
        const {
          createUsername: { error },
        } = data;
        throw new Error(error);
      }
      toast.success('Username successfully created!🤟')
      reloadSession();
    } catch (error: any) {
      toast.error(error?.message + '😞')
      console.log('onSubmit error: ', error);
    }
  };

  return (
    <Center height="100vh">
      {/* Center- флексированный по центру див */}
      <Stack align="center" spacing={4}>
        {/*Stack- колумн див */}
        {session ? (
          <>
            <Text fontSize="3xl">Create a Username</Text>
            <Input
              placeholder="Enter a Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button width="100%" onClick={onSubmit} isLoading={loading}>
              Save
            </Button>
          </>
        ) : (
          <>
            {/* Text- просто <p> тег */}
            <Text fontSize="3xl">Messenger</Text>
            <Button
              onClick={() => signIn('google')}
              leftIcon={<Image height="20px" src="/images/googlelogo.png" />}>
              Continue with Google
            </Button>
          </>
        )}
      </Stack>
    </Center>
  );
};

export default Auth;
