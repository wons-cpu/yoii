import type {FC} from 'react';
import {z} from 'zod';
import {Composition} from 'remotion';
import sampleMovement from '../../fixtures/sample-movement.json';
import type {Movement as MovementData} from '../movement/types';
import {Movement, type MovementProps} from './Movement';

const FPS = 30;
const DRAW_SECONDS = 5;
const HOLD_SECONDS = 2;
const DRAW_DURATION_IN_FRAMES = DRAW_SECONDS * FPS;

// `movement` is fixture-driven JSON, not a Studio-editable control, so it
// passes through untyped by zod here — `MovementData` is the real contract.
const movementCompositionSchema = z.object({
  movement: z.custom<MovementData>(),
  drawDurationInFrames: z.number(),
});

export const RemotionRoot: FC = () => {
  return (
    <Composition<typeof movementCompositionSchema, MovementProps>
      id="Movement"
      component={Movement}
      schema={movementCompositionSchema}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={(DRAW_SECONDS + HOLD_SECONDS) * FPS}
      defaultProps={{
        movement: sampleMovement as unknown as MovementData,
        drawDurationInFrames: DRAW_DURATION_IN_FRAMES,
      }}
    />
  );
};
