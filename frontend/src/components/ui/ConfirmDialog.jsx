import { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const close = () => { setError(null); onClose(); };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} title={title} onClose={close} size="sm"
      footer={<>
        <Button variant="ghost" onClick={close}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={confirm}>{confirmLabel}</Button>
      </>}>
      <p className="confirm__msg">{message}</p>
      {error && <p className="alert alert--error" role="alert">{error}</p>}
    </Modal>
  );
}
