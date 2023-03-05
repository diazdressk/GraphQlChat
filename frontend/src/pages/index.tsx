/* ctrl+shit+P -> Orginaze imports - удалит все ненужные импорты,импортирование сделает в правильно порядке (сначала библиотеки,потом личные импорты)*/
import { Box } from '@chakra-ui/react';
import type { NextPage, NextPageContext } from 'next';
import { getSession, useSession } from 'next-auth/react';
import Auth from '../components/Auth/Auth';
import Chat from '../components/Chat/Chat';
import { Session } from 'next-auth';

const Home: NextPage = () => {
  /* если нажать ctrl+space внутри скобок, то покажутся варианты*/
  const { data: session } = useSession();
  // console.log('data from google', session);

  const reloadSession = () => {
    const event = new Event('visibilitychange');/* при изменении в бд авторефетч */
    document.dispatchEvent(event);
  };

  return (
    <Box>
      {session?.user?.username ? (
        <Chat session={session}/>
      ) : (
        <Auth session={session} reloadSession={reloadSession} />
      )}
    </Box>
  );
};

/* без этого,если через useSession в самом компоненте забираю дату,то сначала рендерится Sign In на долю секунды и только потом логинится и отображается Sign Out */
export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  return {
    props: {
      session,
    },
  };
}

export default Home;
