import DeviceManageClient from './device-manage-client';

export const instant = false;

export default async function DeviceManagePage({ params }) {
  const { id } = await params;
  return <DeviceManageClient id={id} />;
}
