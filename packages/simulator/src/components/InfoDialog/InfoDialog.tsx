import * as React from 'react';
import {
  Dialog,
  Box,
  Stack,
  Tabs,
  Tab,
  Typography,
  Grid,
  Link,
} from '@mui/material';
import { commands } from './commands';

const tabSx = {
  color: `rgb(255,255,255,0.8)`,
  textTransform: 'none',
  fontWeight: 300,
  '&.Mui-selected': {
    color: 'white',
    fontWeight: 400,
  },
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
}

const twitterLink = (
  <Link
    color="inherit"
    target="_blank"
    key="tlink"
    href="https://x.com/lightshow_d"
  >
    @lightshow_d
  </Link>
);

const siteLink = (
  <Link
    color="inherit"
    target="_blank"
    key="tlink"
    href="https://lightshowd.com/blog"
  >
    lightshowd.com
  </Link>
);

export const InfoDialog: React.FC<DialogProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<number>(0);

  return (
    <Dialog
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          backgroundColor: `rgb(50,50,50)`,
          color: 'white',
        },
      }}
    >
      <Stack p={2} pt={0} gap={1} sx={{ fontWeight: 400 }} direction="column">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            TabIndicatorProps={{ sx: { backgroundColor: 'white' } }}
            value={activeTab}
            aria-label="Sequence info"
            onChange={(_, tabIndex) => setActiveTab(tabIndex)}
          >
            <Tab key="tab1" sx={tabSx} label="What is it?" {...a11yProps(0)} />
            <Tab key="tab2" sx={tabSx} label="How it works" {...a11yProps(1)} />
            <Tab key="tab3" sx={tabSx} label="Commands" {...a11yProps(2)} />
          </Tabs>
        </Box>
        <TabPanel key="tp1" value={activeTab} index={0}>
          <BodyText>A UI for previewing light show sequences.</BodyText>
          <BodyText>
            We are just getting warmed up so check out {siteLink} for updates.
          </BodyText>
          <BodyText>
            Any questions? feedback? interested in purchasing these sequences?
            <br />
            Contact support@lightshowd.com or DM {twitterLink}.
          </BodyText>
        </TabPanel>
        <TabPanel key="tp2" value={activeTab} index={1}>
          <BodyText>
            On the desktop, mouse down and drag to draw a strand of lights.
            Press <Code>ESC</Code> and it will be assigned a "channel".
          </BodyText>
          <BodyText>
            Each sequence supports 16 channels, so you can draw one or more
            lines, press <Code>ESC</Code>, and repeat 16 times for the full
            effect.
          </BodyText>
          <BodyText>Play the video at any time to see it in action.</BodyText>
        </TabPanel>
        <TabPanel key="tp3" value={activeTab} index={2}>
          <Grid container spacing={1}>
            {commands.map(([command, description], index) => {
              return [
                <Grid key={`command-${index}`} item xs={5} md={4}>
                  <BodyText>
                    <code>{command}</code>
                  </BodyText>
                </Grid>,
                <Grid key={`desc-${index}`} item xs={7} md={8}>
                  <BodyText>{description}</BodyText>
                </Grid>,
              ];
            })}
          </Grid>
        </TabPanel>
        <Box
          sx={{
            pt: 1,
            textAlign: 'center',
            color: 'white',
          }}
        >
          <Typography variant="caption">
            © {new Date().getFullYear()} lightshowd
          </Typography>
        </Box>
      </Stack>
    </Dialog>
  );
};

const infoTabId = 'sequenceinfo-tab';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      key={`tp${index}`}
      hidden={value !== index}
      id={`${infoTabId}panel-${index}`}
      aria-labelledby={`${infoTabId}-${index}`}
      {...other}
    >
      {value === index && <Stack gap={1}>{children}</Stack>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `${infoTabId}-${index}`,
    'aria-controls': `${infoTabId}panel-${index}`,
  };
}

function BodyText(props) {
  const { children } = props;
  return <Typography variant="body2">{children}</Typography>;
}

function Code(props) {
  const { children } = props;
  return <code style={{ fontFamily: 'monospace' }}>{children}</code>;
}
