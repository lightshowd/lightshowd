import * as React from 'react';
import { Backdrop, Box, CircularProgress } from '@mui/material';

export const LoadingModal: React.FC<{ open: boolean }> = ({ open }) => {
  return (
    <Backdrop open={open}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    </Backdrop>
  );
};
