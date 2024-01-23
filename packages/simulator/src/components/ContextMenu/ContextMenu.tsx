import * as React from 'react';

import { Menu, MenuItem, MenuItemProps, Box } from '@mui/material';
import { NestedMenuItem } from 'mui-nested-menu';
import { fillImages, getFillImage } from '../../helpers';
import type { FillImageType } from '../../helpers';

interface ContextMenuProps {
  containerId?: string;
  onChange: (e: React.ChangeEvent, values: { [key: string]: any }) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  containerId = 'space-canvas',
  onChange,
}) => {
  const handleChange = (e, { action, payload }) => {
    onChange(e, { action, payload });
    handleClose();
  };

  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
          // Other native context menus might behave different.
          // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
          null
    );
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  React.useEffect(() => {
    document
      .getElementById(containerId)
      .addEventListener('contextmenu', handleContextMenu);
    return () => {
      document
        .getElementById(containerId)
        .removeEventListener('contextmenu', handleContextMenu);
    };
  });

  return (
    <Menu
      open={contextMenu !== null}
      onClose={handleClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
      MenuListProps={{
        dense: true,
      }}
    >
      <NestedMenuItem
        dense
        MenuProps={{
          MenuListProps: {
            dense: true,
          },
        }}
        sx={{
          '& .MuiTypography-root': {
            typography: 'body2',
            fontWeight: 'bold',
            pl: 1.5,
          },
        }}
        label="Strand"
        parentMenuOpen={contextMenu !== null}
      >
        {Object.keys(fillImages).map((type: FillImageType) => {
          return (
            <FillItem
              key={type}
              onClick={(e) =>
                handleChange(e, { action: 'fill', payload: type })
              }
              type={type}
            />
          );
        })}
      </NestedMenuItem>
    </Menu>
  );
};

const FillItem = ({
  type,
  ...MenuItemProps
}: Partial<Omit<MenuItemProps, 'children'>> & { type: FillImageType }) => {
  const imgSrc = getFillImage(type).src;

  return (
    <MenuItem
      {...MenuItemProps}
      sx={{
        backgroundColor: 'black',
        '&:hover': {
          backgroundColor: 'black',
        },
      }}
    >
      <Box
        sx={{
          cursor: 'pointer',
          backgroundImage: `url(${imgSrc})`,
          width: 28,
          height: 4,
        }}
      />
    </MenuItem>
  );
};
