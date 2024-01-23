import * as React from 'react';

import {
  Portal,
  ClickAwayListener,
  Paper,
  Select,
  MenuItem,
} from '@mui/material';

interface ElementSettingsPopoverProps {
  top: number;
  left: number;
  forceOpen?: boolean;
  channel?: number;
  box?: string;
  onChange: (e: React.ChangeEvent, values: { [key: string]: any }) => void;
  channels: { channel: number; box: any }[];
}

export const ElementSettingsPopover: React.FC<ElementSettingsPopoverProps> = ({
  top,
  left,
  channel,
  box,
  forceOpen = true,
  onChange,
  channels,
}) => {
  const [open, setOpen] = React.useState(true);
  const [currPosition, setCurrPosition] = React.useState({ top, left });

  const [values, setValues] = React.useState({
    channel,
    box,
  });

  React.useMemo(() => {
    setValues({ channel, box });
  }, [channel, box]);

  React.useEffect(() => {
    setCurrPosition({ top, left });
    // Set on the next turn to allow click outside to finish
    setTimeout(() => setOpen(true));
  }, [top, left]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    let newValues;
    if (name === 'channel') {
      const [box, channel] = value.split(':');
      newValues = { ...values, box, channel: Number(channel) };
    } else {
      newValues = { ...values, ...{ [name]: value } };
    }
    setValues(newValues);
    onChange(e, newValues);
  };

  return (
    <Portal>
      <ClickAwayListener
        mouseEvent="onMouseDown"
        touchEvent="onTouchStart"
        onClickAway={() => setOpen(false)}
      >
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            backgroundColor: 'white',
            display: open ? 'inherit' : 'none',
            ...currPosition,
          }}
        >
          <Select
            id="channel"
            name="channel"
            variant="outlined"
            size="small"
            value={`${values.box}:${values.channel}`}
            onChange={handleFieldChange}
            inputProps={{
              sx: {
                typography: (theme) => theme.typography.caption,
                fontWeight: 'bold',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 300,
                  width: 225,
                },
              },
              MenuListProps: {
                disablePadding: true,
                sx: {
                  display: 'grid',
                  m: 1,
                  gridTemplateColumns: '1fr 1fr',
                },
              },
            }}
          >
            {channels.map((c) => (
              <MenuItem
                key={`${c.box.id}:${c.channel}`}
                sx={{
                  typography: (theme) => theme.typography.caption,
                }}
                value={`${c.box.id}:${c.channel}`}
              >
                {c.box.id}:{c.channel}
              </MenuItem>
            ))}
          </Select>
        </Paper>
      </ClickAwayListener>
    </Portal>
  );
};
