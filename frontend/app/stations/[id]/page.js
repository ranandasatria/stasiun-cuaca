import StationClient from './station-client';

export const instant = false;

export default async function StationPage({ params }) {
  const { id } = await params;
  return <StationClient id={id} />;
}
