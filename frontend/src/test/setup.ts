import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove rendered components after each test so tests cannot affect each other.
afterEach(cleanup)
