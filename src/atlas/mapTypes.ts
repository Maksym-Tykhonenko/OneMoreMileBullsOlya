export type AtlasStackParamList = {
  dawnGate: undefined;
  introSteps: undefined;
  harborHub: undefined;

  fieldNotes: undefined;  
  questStart: undefined;  
  trailSearch: undefined;  
  myBay: undefined;        
  benchRoom: undefined;    
  controlDesk: undefined;
};

export const ROUTES: { [K in keyof AtlasStackParamList]: K } = {
  dawnGate: 'dawnGate',
  introSteps: 'introSteps',
  harborHub: 'harborHub',
  fieldNotes: 'fieldNotes',
  questStart: 'questStart',
  trailSearch: 'trailSearch',
  myBay: 'myBay',
  benchRoom: 'benchRoom',
  controlDesk: 'controlDesk',
};
