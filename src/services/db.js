export function mustOk(res) {
  if (res.error) throw res.error;
  return res.data;
}
