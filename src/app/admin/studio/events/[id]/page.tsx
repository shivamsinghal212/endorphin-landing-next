import { EventHome } from './_event-home';

export const metadata = {
  title: 'Your event | Endorfin Studio',
  robots: { index: false, follow: false },
};

export default async function StudioEventHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventHome eventId={id} />;
}
